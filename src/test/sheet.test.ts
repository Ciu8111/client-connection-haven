import { describe, expect, it } from "vitest";
import { buildSheetDocument, computeRecords, extractStateFromFile, sheetE1RM } from "@/lib/sheet";

const TEMPLATE =
  '<script id="embeddedStateData" type="application/json">null</script><script>var SEED = /*__SHEET_SEED__*/null;</script>';

describe("sheet document", () => {
  it("embeds saved data so it cannot break out of the script tag", () => {
    const html = buildSheetDocument(TEMPLATE, { days: [], meta: { athlete: "</script><b>x" } }, {});
    expect(html).not.toContain("</script><b>");
    expect(extractStateFromFile(html)?.meta?.athlete).toBe("</script><b>x");
  });

  it("reads the data from an exported client file", () => {
    const file = '<html><script id="embeddedStateData" type="application/json">{"days":[],"meta":{"athlete":"PIERPAOLO"}}</script></html>';
    expect(extractStateFromFile(file)?.meta?.athlete).toBe("PIERPAOLO");
  });

  it("rejects files without sheet data", () => {
    expect(extractStateFromFile("<html></html>")).toBeNull();
  });
});

describe("records", () => {
  it("e1RM uses the reps after the x (4x6 at 80 kg = 96 kg)", () => {
    expect(sheetE1RM(80, "4x6")).toBe(96);
    expect(sheetE1RM(80, "6x1")).toBe(80);
  });

  it("keeps the heaviest load per lift across mesocycles", () => {
    const recs = computeRecords([
      { title: "Meso 1", data: { lifts: [{ id: "a", label: "Squat" }], tracker: { a: [{ kg: 70, sr: "4x2" }, { kg: 80, sr: "6x1" }] } } },
      { title: "Meso 2", data: { lifts: [{ id: "b", label: "squat" }], tracker: { b: [{ kg: "85", sr: "4x1" }] } } },
    ]);
    const squat = recs.find((r) => r.kind === "kg");
    expect(squat?.best).toBe(85);
    expect(squat?.source).toBe("Meso 2");
  });

  it("keeps the highest jump", () => {
    const recs = computeRecords([
      { title: "M", data: { metrics: { jumps: [{ name: "CMJ", unit: "cm", weeks: ["38,5", "", "41.2"] }] } } },
    ]);
    expect(recs[0]?.best).toBe(41.2);
  });
});
