import { useCallback, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import type { SheetState } from "@/lib/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetFrame } from "@/components/app/SheetFrame";

export const Route = createFileRoute("/_authenticated/clienti/$clientId/schede/$mesoId")({
  head: () => ({
    meta: [
      { title: "Scheda allenamento — S&C FP Hub" },
      { name: "description", content: "Programma, carichi, antropometria e test di salto del mesociclo." },
      { property: "og:title", content: "Scheda allenamento — S&C FP Hub" },
      { property: "og:description", content: "Programma, carichi, antropometria e test di salto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SheetPage,
});

function SheetPage() {
  const { clientId, mesoId } = Route.useParams();
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const onSaved = useCallback((d: Date) => setSavedAt(d), []);

  const { data, isLoading } = useQuery({
    queryKey: ["sheet", mesoId],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [{ data: meso, error }, { data: sheet }, { data: client }] = await Promise.all([
        supabase.from("mesocycles").select("*").eq("id", mesoId).maybeSingle(),
        supabase.from("mesocycle_sheets").select("data").eq("mesocycle_id", mesoId).maybeSingle(),
        supabase.from("clients").select("id, full_name, coach_id").eq("id", clientId).maybeSingle(),
      ]);
      if (error) throw error;
      return { meso, sheet: (sheet?.data as SheetState | null) ?? null, client };
    },
  });

  const publish = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("mesocycles").update({ status }).eq("id", mesoId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(["sheet", mesoId], (old: typeof data) =>
        old?.meso ? { ...old, meso: { ...old.meso, status } } : old,
      );
      queryClient.invalidateQueries({ queryKey: ["mesocycles", clientId] });
      toast.success(status === "published" ? "Pubblicata: l'atleta ora può compilarla" : "Tornata in bozza");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !me) {
    return (
      <div className="mx-auto max-w-[1520px] px-3 py-4 sm:px-6">
        <Skeleton className="h-[70vh] rounded-xl" />
      </div>
    );
  }
  if (!data?.meso || !data.client) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Scheda non disponibile</h1>
        <Button asChild variant="link">
          <Link to="/clienti/$clientId" params={{ clientId }}>
            Torna alla cartella
          </Link>
        </Button>
      </div>
    );
  }

  const isCoach = data.client.coach_id === me.user.id;
  const published = data.meso.status === "published";
  const dateIt = data.meso.start_date ? new Date(data.meso.start_date + "T00:00:00").toLocaleDateString("it-IT") : "";

  return (
    <main className="mx-auto max-w-[1520px] px-3 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Torna alla cartella">
            <Link to="/clienti/$clientId" params={{ clientId }}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{data.client.full_name}</p>
            <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{data.meso.title}</h1>
          </div>
          {isCoach && <Badge variant={published ? "default" : "outline"}>{published ? "Pubblicato" : "Bozza"}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Salvato alle ${savedAt.toLocaleTimeString("it-IT", { timeStyle: "short" })}` : "Le modifiche si salvano da sole"}
          </span>
          {isCoach && (
            <Button
              variant={published ? "outline" : "hero"}
              size="sm"
              onClick={() => publish.mutate(published ? "draft" : "published")}
            >
              {published ? <EyeOff /> : <Eye />}
              {published ? "Ritira" : "Pubblica"}
            </Button>
          )}
        </div>
      </div>
      <SheetFrame
        key={mesoId}
        mesocycleId={mesoId}
        clientId={clientId}
        initialData={data.sheet}
        seed={{ athlete: data.client.full_name.toUpperCase(), goal: data.meso.goal ?? "", date: dateIt }}
        canInsert={isCoach}
        onSaved={onSaved}
      />
    </main>
  );
}
