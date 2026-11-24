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
      return parsed && Array.isArray(parsed.days) ? upgradeLegacySheet(parsed) : null;
    }
    const m = trimmed.match(
      /<script id="(?:initialData|embeddedStateData)" type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (!m || !m[1]) return null;
    const parsed = JSON.parse(m[1]) as SheetState | null;
    return parsed && Array.isArray(parsed.days) ? upgradeLegacySheet(parsed) : null;
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

type LegacyDay = {
  title?: string;
  weekLabels?: string[];
  rows?: { ex?: string; rec?: string; rest?: string; note?: string; weeks?: string[]; hidden?: boolean }[];
};
type LegacySheet = SheetState & {
  lifts?: { id: string; label: string; color?: string }[];
  tracker?: Record<string, { kg?: number | string }[]>;
  trackerWeekLabels?: string[];
  metrics?: Record<string, { name: string; unit?: string; weeks?: string[] }[]>;
  metricWeekLabels?: Record<string, string[]>;
  labels?: Record<string, unknown>;
  legacyUpgraded?: boolean;
};

const isBlank = (vals: unknown[] | undefined) => !vals || vals.every((v) => String(v ?? "").trim() === "");

/**
 * Converts a sheet saved with the previous module (v6: lifts/tracker/metrics) to the
 * current layout (kgItems/evalData), keeping all original keys. Idempotent.
 */
export function upgradeLegacySheet(input: SheetState | null): SheetState | null {
  if (!input) return input;
  const d = input as LegacySheet;
  if (d.legacyUpgraded || (!Array.isArray(d.lifts) && !d.metrics)) return input;
  const out: LegacySheet = { ...d, legacyUpgraded: true };

  const days = (Array.isArray(d.days) ? d.days : []) as LegacyDay[];
  const longest = days.reduce<LegacyDay | undefined>(
    (best, day) => ((day.weekLabels?.length ?? 0) > (best?.weekLabels?.length ?? 0) ? day : best),
    undefined,
  );
  if (longest?.weekLabels?.length) out["weekLabels"] = [...longest.weekLabels];
  out.days = days.map((day) => ({
    ...day,
    rows: (day.rows ?? []).map((r) => ({ ...r, rest: r.rest ?? r.rec ?? "", note: r.note ?? "", weeks: r.weeks ?? [] })),
  }));

  if (Array.isArray(d.lifts) && (!d.kgItems || d.kgItems.every((i) => isBlank(i.values)))) {
    out.kgItems = d.lifts.map((l, idx) => ({
      id: `kg_${idx + 1}`,
      label: l.label.trim(),
      color: l.color ?? "#1E3A8A",
      values: (d.tracker?.[l.id] ?? []).map((t) => (t.kg === undefined || t.kg === null ? "" : String(t.kg))),
    }));
  }

  const m = d.metrics ?? {};
  const toRows = (items: { name: string; unit?: string; weeks?: string[] }[] = []) =>
    items.map((it) => ({ name: it.name, unit: it.unit ?? "", vals: [...(it.weeks ?? [])] }));
  const evalData = { ...(d.evalData ?? {}) };
  const jumpsEmpty = !evalData.jumps || evalData.jumps.rows.every((r) => !r.name?.trim() && isBlank(r.vals));
  if (m["jumps"]?.length && jumpsEmpty) {
    const rows = toRows(m["jumps"]);
    const n = Math.max(1, ...rows.map((r) => r.vals.length));
    evalData.jumps = { cols: (d.metricWeekLabels?.["jumps"] ?? []).slice(0, n), rows };
  }
  const anthroEmpty = !evalData.anthro || evalData.anthro.rows.every((r) => !r.name?.trim() && isBlank(r.vals));
  const anthroSrc = [...(m["bodyWeight"] ?? []), ...(m["circumferences"] ?? [])];
  if (anthroSrc.length && anthroEmpty) {
    const rows = toRows(anthroSrc);
    const n = Math.max(1, ...rows.map((r) => r.vals.length));
    const cols = d.metricWeekLabels?.["bodyWeight"] ?? [];
    evalData.anthro = {
      cols: Array.from({ length: n }, (_, i) => cols[i] ?? `Test ${i + 1}`),
      rows: rows.map((r) => ({ ...r, vals: Array.from({ length: n }, (_, i) => r.vals[i] ?? "") })),
    };
  }
  if (evalData.jumps) {
    const n = Math.max(1, ...evalData.jumps.rows.map((r) => r.vals.length));
    evalData.jumps = {
      cols: Array.from({ length: n }, (_, i) => evalData.jumps?.cols[i] ?? `Test ${i + 1}`),
      rows: evalData.jumps.rows.map((r) => ({ ...r, vals: Array.from({ length: n }, (_, i) => r.vals[i] ?? "") })),
    };
  }
  out.evalData = evalData;

  const legacyTitle = d.labels?.["mainTitle"];
  if (typeof legacyTitle === "string" && (!d.mainTitle || d.mainTitle.includes("BASE VUOTA"))) out.mainTitle = legacyTitle;
  const legacyNote = (d.meta as Record<string, unknown> | undefined)?.["testNote"];
  if (typeof legacyNote === "string" && legacyNote && !d.meta?.note) out.meta = { ...d.meta, note: legacyNote };
  return out;
}
