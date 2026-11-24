/* Helpers for the training sheet ("Scheda Allenamento & Test") stored per mesocycle. */

export const SHEET_TEMPLATE_URL = "/scheda/modulo-scheda.html";

type TrackedItem = { id?: string; label: string; color?: string; values: (string | number)[] };
type EvalRow = { name: string; unit?: string; vals: (string | number)[] };

export type SheetState = {
  mainTitle?: string;
  meta?: { athlete?: string; goal?: string; date?: string; note?: string };
  kgItems?: TrackedItem[];
  repItems?: TrackedItem[];
  evalData?: { anthro?: { cols: string[]; rows: EvalRow[] }; jumps?: { cols: string[]; rows: EvalRow[] } };
  days?: unknown[];
  [key: string]: unknown;
};

export type SheetSeed = { athlete?: string; goal?: string; date?: string; title?: string };

const EMBED_EMPTY = '<script id="initialData" type="application/json">null</script>';

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
    .replace(EMBED_EMPTY, () => `<script id="initialData" type="application/json">${safeJsonForScript(state)}</script>`)
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
    const m = trimmed.match(/<script id="initialData" type="application\/json">([\s\S]*?)<\/script>/);
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

/** Epley estimated 1RM; a single rep is the load itself. */
export function estimate1RM(kg: number, reps: number): number | null {
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(reps) || reps <= 0) return null;
  if (reps <= 1) return Math.round(kg * 10) / 10;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export type SheetRecord = {
  kind: "kg" | "rep" | "jump";
  name: string;
  best: number;
  unit: string;
  source: string;
};

/** All-time bests per tracked lift (kg), bodyweight exercise (rep) and jump test across sheets. */
export function computeRecords(sheets: { title: string; data: SheetState | null }[]): SheetRecord[] {
  const out = new Map<string, SheetRecord>();
  const consider = (kind: SheetRecord["kind"], name: string | undefined, values: unknown[], unit: string, source: string) => {
    const label = name?.trim();
    if (!label) return;
    const nums = values.map(parseSheetNumber).filter((n): n is number => n !== null);
    if (!nums.length) return;
    const best = Math.max(...nums);
    const key = `${kind}:${label.toLowerCase()}`;
    const prev = out.get(key);
    if (!prev || best > prev.best) out.set(key, { kind, name: label, best, unit, source });
  };
  for (const { title, data } of sheets) {
    if (!data) continue;
    for (const it of data.kgItems ?? []) consider("kg", it.label, it.values ?? [], "kg", title);
    for (const it of data.repItems ?? []) consider("rep", it.label, it.values ?? [], "rep", title);
    for (const r of data.evalData?.jumps?.rows ?? []) consider("jump", r.name, r.vals ?? [], r.unit || "cm", title);
  }
  return [...out.values()];
}
