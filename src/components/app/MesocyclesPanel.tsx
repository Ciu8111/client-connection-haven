import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Eye, EyeOff, FileUp, Plus, Sheet, Trash2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { extractStateFromFile, type SheetState } from "@/lib/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = { clientId: string; clientName: string; isCoach: boolean };

export function useMesocycles(clientId: string) {
  return useQuery({
    queryKey: ["mesocycles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mesocycles")
        .select("*, mesocycle_sheets(updated_at)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function MesocyclesPanel({ clientId, clientName, isCoach }: Props) {
  const queryClient = useQueryClient();
  const { data: mesos, isLoading } = useMesocycles(clientId);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("mesocycles").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["mesocycles", clientId] });
      toast.success(status === "published" ? "Scheda pubblicata: l'atleta ora la vede" : "Scheda tornata in bozza");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mesocycles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesocycles", clientId] });
      toast.success("Mesociclo eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isCoach
            ? "Crea un mesociclo, compila la scheda e pubblicala quando è pronta per l'atleta."
            : "Apri la scheda pubblicata dal tuo coach e compila i tuoi dati: si salvano da soli."}
        </p>
        {isCoach && <NewMesocycleDialog clientId={clientId} clientName={clientName} existing={mesos ?? []} />}
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : !mesos?.length ? (
        <div className="glass mt-4 rounded-2xl px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-icon-tile text-primary">
            <Sheet className="size-6" />
          </span>
          <p className="mt-3 font-display text-lg font-semibold">
            {isCoach ? "Nessun mesociclo" : "Nessuna scheda pubblicata"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCoach ? "Crea il primo mesociclo per questo atleta." : "Il tuo coach non ha ancora pubblicato una scheda."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {mesos.map((m) => {
            const published = m.status === "published";
            const updated = m.mesocycle_sheets?.updated_at;
            return (
              <article key={m.id} className="glass flex flex-col rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold">{m.title}</h3>
                    {m.goal && <p className="text-sm text-muted-foreground">{m.goal}</p>}
                  </div>
                  {isCoach && (
                    <Badge variant={published ? "default" : "outline"}>{published ? "Pubblicato" : "Bozza"}</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {m.start_date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      Inizio {new Date(m.start_date + "T00:00:00").toLocaleDateString("it-IT")}
                    </span>
                  )}
                  {updated && (
                    <span>
                      Aggiornata {new Date(updated).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="hero" size="sm">
                    <Link to="/clienti/$clientId/schede/$mesoId" params={{ clientId, mesoId: m.id }}>
                      <Sheet /> Apri scheda
                    </Link>
                  </Button>
                  {isCoach && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus.mutate({ id: m.id, status: published ? "draft" : "published" })}
                      >
                        {published ? <EyeOff /> : <Eye />}
                        {published ? "Ritira" : "Pubblica"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-destructive">
                            <Trash2 />
                            <span className="sr-only">Elimina</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare "{m.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>La scheda e tutti i dati compilati verranno persi.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(m.id)}>Elimina</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

type Source = "template" | "copy" | "file";

function NewMesocycleDialog({
  clientId,
  clientName,
  existing,
}: {
  clientId: string;
  clientName: string;
  existing: { id: string; title: string }[];
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [source, setSource] = useState<Source>("template");
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [imported, setImported] = useState<{ name: string; state: SheetState } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let data: SheetState | null = null;
      if (source === "copy") {
        if (!copyFrom) throw new Error("Scegli il mesociclo da copiare");
        const { data: row, error } = await supabase
          .from("mesocycle_sheets")
          .select("data")
          .eq("mesocycle_id", copyFrom)
          .maybeSingle();
        if (error) throw error;
        data = (row?.data as SheetState | null) ?? null;
      }
      if (source === "file") {
        if (!imported) throw new Error("Carica il file della scheda");
        data = imported.state;
      }
      const dateIt = startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("it-IT") : "";
      if (data) {
        data = {
          ...data,
          meta: {
            ...(data.meta ?? {}),
            athlete: data.meta?.athlete || clientName,
            ...(goal ? { goal } : {}),
            ...(dateIt ? { date: dateIt } : {}),
          },
        };
      }
      const { data: meso, error } = await supabase
        .from("mesocycles")
        .insert({ client_id: clientId, title: title.trim(), goal: goal.trim() || null, start_date: startDate || null })
        .select("id")
        .single();
      if (error) throw error;
      const { error: sheetErr } = await supabase
        .from("mesocycle_sheets")
        .insert({ mesocycle_id: meso.id, client_id: clientId, data: data as Json });
      if (sheetErr) throw sheetErr;
      return meso.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["mesocycles", clientId] });
      setOpen(false);
      navigate({ to: "/clienti/$clientId/schede/$mesoId", params: { clientId, mesoId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    const state = extractStateFromFile(await file.text());
    if (!state) {
      toast.error("Questo file non contiene una scheda valida");
      setImported(null);
      return;
    }
    setImported({ name: file.name, state });
    if (!title && state.mainTitle) setTitle(state.mainTitle.replace(/^PROGRAMMA DI ALLENAMENTO\s*—\s*/i, ""));
    if (!goal && state.meta?.goal) setGoal(state.meta.goal);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <Plus /> Nuovo mesociclo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuovo mesociclo</DialogTitle>
            <DialogDescription>La scheda resta in bozza finché non la pubblichi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="m-title">Titolo</Label>
            <Input id="m-title" required placeholder="Es. Mesociclo 9 settimane" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="m-goal">Obiettivo / Fase</Label>
              <Input id="m-goal" placeholder="Es. In season" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-date">Data inizio</Label>
              <Input id="m-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Parti da</Label>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)} className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="template" /> <span className="text-sm">Scheda base vuota</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="copy" disabled={!existing.length} />
                <span className="text-sm">Copia di un mesociclo precedente</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="file" />
                <span className="text-sm">Importa una scheda esistente (.html o .json)</span>
              </label>
            </RadioGroup>
          </div>

          {source === "copy" && (
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli il mesociclo" />
              </SelectTrigger>
              <SelectContent>
                {existing.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {source === "file" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm,.json,text/html,application/json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <FileUp /> {imported ? imported.name : "Scegli il file"}
              </Button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Usa il file salvato con "Salva Copia HTML" o "Esporta JSON" dalla tua scheda.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" variant="hero" disabled={create.isPending}>
              Crea e apri la scheda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
