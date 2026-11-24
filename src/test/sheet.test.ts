import { describe, expect, it } from "vitest";
import { buildSheetDocument, computeRecords, estimate1RM, extractStateFromFile } from "@/lib/sheet";

const TEMPLATE =
  '<script id="initialData" type="application/json">null</script><script>var SEED = /*__SHEET_SEED__*/null;</script>';

describe("sheet document", () => {
  it("embeds saved data so it cannot break out of the script tag", () => {
    const html = buildSheetDocument(TEMPLATE, { days: [], meta: { athlete: "</script><b>x" } }, {});
    expect(html).not.toContain("</script><b>");
    expect(extractStateFromFile(html)?.meta?.athlete).toBe("</script><b>x");
  });

  it("reads the data from an exported client file", () => {
    const file =
      '<html><script id="initialData" type="application/json">{"days":[],"meta":{"athlete":"Francesco Pierro"}}</script></html>';
    expect(extractStateFromFile(file)?.meta?.athlete).toBe("Francesco Pierro");
  });

  it("rejects files without sheet data", () => {
    expect(extractStateFromFile("<html></html>")).toBeNull();
  });
});

describe("records", () => {
  it("e1RM (Epley): 100 kg x 5 = 116.7 kg, 1 rep = the load", () => {
    expect(estimate1RM(100, 5)).toBe(116.7);
    expect(estimate1RM(140, 1)).toBe(140);
  });

  it("keeps the heaviest load per lift across mesocycles", () => {
    const recs = computeRecords([
      { title: "Meso 1", data: { kgItems: [{ label: "DL", values: ["100", "130", ""] }] } },
      { title: "Meso 2", data: { kgItems: [{ label: "dl", values: ["140"] }] } },
    ]);
    const dl = recs.find((r) => r.kind === "kg");
    expect(dl?.best).toBe(140);
    expect(dl?.source).toBe("Meso 2");
  });

  it("keeps the highest jump and the most reps", () => {
    const recs = computeRecords([
      {
        title: "M",
        data: {
          repItems: [{ label: "Pull up", values: ["8", "11"] }],
          evalData: { jumps: { cols: [], rows: [{ name: "CMJ", unit: "cm", vals: ["38,5", "", "41.2"] }] } },
        },
      },
    ]);
    expect(recs.find((r) => r.kind === "jump")?.best).toBe(41.2);
    expect(recs.find((r) => r.kind === "rep")?.best).toBe(11);
  });
});
