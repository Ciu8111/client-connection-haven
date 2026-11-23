import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Dumbbell, MoveVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeRecords, sheetE1RM, type SheetState } from "@/lib/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function RecordsPanel({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sheets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mesocycle_sheets")
        .select("data, mesocycles(title)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const records = useMemo(
    () =>
      computeRecords(
        (data ?? []).map((r) => ({ title: r.mesocycles?.title ?? "", data: r.data as SheetState | null })),
      ),
    [data],
  );
  const lifts = records.filter((r) => r.kind === "kg").sort((a, b) => b.best - a.best);
  const jumps = records.filter((r) => r.kind === "jump").sort((a, b) => b.best - a.best);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
      <RecordList
        icon={<Dumbbell className="size-4" />}
        title="Fondamentali — miglior carico"
        empty="Compila i carichi nel grafico dei fondamentali per vedere i record."
        rows={lifts.map((r) => ({
          name: r.name,
          value: `${r.best} kg`,
          extra: r.e1rm ? `e1RM ${r.e1rm} kg` : undefined,
          source: r.source,
        }))}
      />
      <RecordList
        icon={<MoveVertical className="size-4" />}
        title="Test di salto — miglior risultato"
        empty="Compila i test di salto per vedere i record."
        rows={jumps.map((r) => ({ name: r.name, value: `${r.best} ${r.unit}`, source: r.source }))}
      />
      <E1rmCalculator />
    </div>
  );
}

function RecordList({
  icon,
  title,
  empty,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  rows: { name: string; value: string; extra?: string; source: string }[];
}) {
  return (
    <section className="glass rounded-xl">
      <h3 className="flex items-center gap-2 border-b border-border px-5 py-3.5 font-display font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.source}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-primary">{r.value}</p>
                {r.extra && <p className="text-xs text-muted-foreground">{r.extra}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function E1rmCalculator() {
  const [kg, setKg] = useState("100");
  const [reps, setReps] = useState("5");
  const value = sheetE1RM(Number(kg.replace(",", ".")), `1x${reps}`);
  return (
    <section className="glass rounded-xl p-5">
      <h3 className="flex items-center gap-2 font-display font-semibold">
        <Calculator className="size-4 text-primary" /> Calcolatore e1RM
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="e-kg">Carico (kg)</Label>
          <Input id="e-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="e-reps">Ripetizioni</Label>
          <Input id="e-reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Massimale stimato (Epley)</p>
      <p className="font-display text-4xl font-bold text-primary">{value ? `${value} kg` : "—"}</p>
    </section>
  );
}
