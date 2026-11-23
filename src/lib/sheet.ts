/* Helpers for the "Modulo Professionale Dinamico v6" sheet stored per mesocycle. */

export type SheetState = {
  meta?: { athlete?: string; goal?: string; date?: string; testNote?: string };
  lifts?: { id: string; label: string; color?: string; hidden?: boolean }[];
  tracker?: Record<string, { kg: number | string; pct?: string; sr?: string; tut?: string }[]>;
  trackerWeekLabels?: string[];
  metrics?: Record<string, { name: string; unit?: string; weeks: string[] }[]>;
  days?: unknown[];
  [key: string]: unknown;
};

export type SheetSeed = { athlete?: string; goal?: string; date?: string };

/** Serialises JSON so it is safe inside a <script> tag. */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Fills the template HTML with the saved state and the seed values. */
export function buildSheetDocument(
  template: string,
  state: SheetState | null,
  seed: SheetSeed,
  readOnly = false,
): string {
  return template
    .replace(
      '<script id="embeddedStateData" type="application/json">null</script>',
      () => `<script id="embeddedStateData" type="application/json">${safeJsonForScript(state)}</script>`,
    )
    .replace("/*__SHEET_SEED__*/null", () => safeJsonForScript(seed))
    .replace("/*__SHEET_READONLY__*/false", readOnly ? "true" : "false");
}

/** Reads the data saved inside an exported client sheet (.html) or a JSON backup. */
export function extractStateFromFile(text: string): SheetState | null {
  const trimmed = text.trim();
  try {
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as SheetState;
      return parsed && Array.isArray(parsed.days) ? parsed : null;
    }
    const m = trimmed.match(/<script id="embeddedStateData" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m || !m[1]) return null;
    const parsed = JSON.parse(m[1]) as SheetState | null;
    return parsed && Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseSheetNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const clean = String(v).replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
  return parseFloat(clean);
}

/** Same rule as the sheet: reps read from "4x6" style series; 1 rep = the load itself. */
export function sheetE1RM(kg: number, sr?: string): number | null {
  if (!Number.isFinite(kg) || kg <= 0) return null;
  let reps = 1;
  const m = sr?.match(/[x×]\s*(\d+)/i);
  if (m && m[1]) reps = parseInt(m[1], 10);
  if (reps <= 1) return Math.round(kg * 10) / 10;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export type SheetRecord = {
  kind: "kg" | "jump";
  name: string;
  best: number;
  unit: string;
  e1rm?: number | null;
  source: string;
};

/** All-time bests per tracked lift (kg, e1RM) and per jump test across sheets. */
export function computeRecords(sheets: { title: string; data: SheetState | null }[]): SheetRecord[] {
  const out = new Map<string, SheetRecord>();
  const push = (key: string, rec: SheetRecord) => {
    const prev = out.get(key);
    if (!prev) return out.set(key, rec);
    if (rec.best > prev.best) out.set(key, { ...rec, e1rm: Math.max(rec.e1rm ?? 0, prev.e1rm ?? 0) || null });
    else if ((rec.e1rm ?? 0) > (prev.e1rm ?? 0)) out.set(key, { ...prev, e1rm: rec.e1rm ?? null });
  };
  for (const { title, data } of sheets) {
    if (!data) continue;
    for (const lift of data.lifts ?? []) {
      const name = lift.label?.trim();
      if (!name) continue;
      let best: number | null = null;
      let bestE: number | null = null;
      for (const entry of data.tracker?.[lift.id] ?? []) {
        const kg = parseSheetNumber(entry.kg);
        if (kg === null) continue;
        if (best === null || kg > best) best = kg;
        const e = sheetE1RM(kg, entry.sr);
        if (e !== null && (bestE === null || e > bestE)) bestE = e;
      }
      if (best !== null) push("kg:" + name.toLowerCase(), { kind: "kg", name, best, unit: "kg", e1rm: bestE, source: title });
    }
    for (const jump of data.metrics?.["jumps"] ?? []) {
      const name = jump.name?.trim();
      if (!name) continue;
      const vals = (jump.weeks ?? []).map(parseSheetNumber).filter((n): n is number => n !== null);
      if (vals.length === 0) continue;
      push("jump:" + name.toLowerCase(), { kind: "jump", name, best: Math.max(...vals), unit: jump.unit || "cm", source: title });
    }
  }
  return [...out.values()];
}
