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

describe("old sheets (previous module)", () => {
  const legacy = {
    meta: { athlete: "PIERPAOLO SPINELLI", goal: "IN SEASON", date: "" },
    labels: { mainTitle: "PROGRAMMA DI ALLENAMENTO — MESOCICLO 9 SETTIMANE" },
    lifts: [{ id: "lift_squat", label: "1-Squat ", color: "#1E3A5F" }],
    tracker: { lift_squat: [{ kg: 70 }, { kg: 80 }, { kg: "" }] },
    days: [
      {
        title: "GIORNO 1",
        weekLabels: ["Fine1Blocco", "W1", "W2"],
        rows: [{ ex: "1-Squat", rec: "90 sec", note: "D3''F2''", weeks: ["4sx2 70kg", "6sx1 80kg", ""] }],
      },
    ],
    metrics: { jumps: [{ name: "Salto da fermo (CMJ)", unit: "cm", weeks: ["38"] }] },
  };

  it("keeps loads, rest times, week labels and jumps when opened in the new sheet", async () => {
    const { upgradeLegacySheet } = await import("@/lib/sheet");
    const up = upgradeLegacySheet(legacy) as Record<string, unknown> & {
      kgItems: { label: string; values: string[] }[];
      days: { rows: { rest: string }[] }[];
      evalData: { jumps: { rows: { name: string; vals: string[] }[] } };
    };
    expect(up.kgItems[0]?.label).toBe("1-Squat");
    expect(up.kgItems[0]?.values).toEqual(["70", "80", ""]);
    expect(up.days[0]?.rows[0]?.rest).toBe("90 sec");
    expect(up["weekLabels"]).toEqual(["Fine1Blocco", "W1", "W2"]);
    expect(up.evalData.jumps.rows[0]?.vals).toEqual(["38"]);
    expect(up["mainTitle"]).toBe("PROGRAMMA DI ALLENAMENTO — MESOCICLO 9 SETTIMANE");
  });

  it("is applied only once", async () => {
    const { upgradeLegacySheet } = await import("@/lib/sheet");
    const once = upgradeLegacySheet(legacy);
    expect(upgradeLegacySheet(once)).toBe(once);
  });
});
