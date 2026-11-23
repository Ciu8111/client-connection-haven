import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, FolderOpen, Plus, Search, UserCheck, UserRoundPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — S&C FP Hub" },
      { name: "description", content: "Le cartelle dei tuoi atleti." },
      { property: "og:title", content: "Dashboard — S&C FP Hub" },
      { property: "og:description", content: "Le cartelle dei tuoi atleti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me, isLoading } = useCurrentUser();
  if (isLoading || !me) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  return me.isCoach ? <CoachDashboard userId={me.user.id} /> : <AthleteHome userId={me.user.id} />;
}

function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, mesocycles(id, status)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

function CoachDashboard({ userId }: { userId: string }) {
  const { data: clients, isLoading } = useClients();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      (clients ?? [])
        .filter((c) => c.coach_id === userId)
        .filter((c) => `${c.full_name} ${c.email} ${c.sport ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [clients, q, userId],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">I tuoi atleti</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Cartelle clienti</h1>
        </div>
        <AddClientDialog />
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca atleta…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass mt-6 flex flex-col items-center rounded-2xl px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-icon-tile text-primary">
            <FolderOpen className="size-6" />
          </span>
          <h2 className="mt-4 text-xl font-semibold">
            {clients?.length ? "Nessun atleta trovato" : "Crea la prima cartella"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Aggiungi un atleta con la sua email: quando si registra con quella email vedrà solo la sua cartella.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const published = c.mesocycles.filter((m) => m.status === "published").length;
            return (
              <Link
                key={c.id}
                to="/clienti/$clientId"
                params={{ clientId: c.id }}
                className="glass group flex flex-col rounded-xl p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold">{c.full_name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.athlete_user_id ? (
                    <Badge variant="secondary" className="gap-1">
                      <UserCheck className="size-3" /> Account attivo
                    </Badge>
                  ) : (
                    <Badge variant="outline">In attesa di registrazione</Badge>
                  )}
                  <Badge variant="outline">
                    {c.mesocycles.length} mesocicli · {published} pubblicati
                  </Badge>
                  {c.sport && <Badge variant="outline">{c.sport}</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function AddClientDialog() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", sport: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          sport: form.sport.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cartella creata");
      setOpen(false);
      setForm({ full_name: "", email: "", sport: "", notes: "" });
      navigate({ to: "/clienti/$clientId", params: { clientId: data.id } });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Hai già un atleta con questa email" : e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero">
          <UserRoundPlus /> Nuovo atleta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuova cartella atleta</DialogTitle>
            <DialogDescription>
              L'atleta dovrà registrarsi con questa email per accedere alla sua cartella.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Nome e cognome</Label>
            <Input id="c-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-sport">Sport / disciplina</Label>
            <Input id="c-sport" placeholder="Es. Calcio, Powerlifting" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Note</Label>
            <Textarea id="c-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="hero" disabled={create.isPending}>
              <Plus /> Crea cartella
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AthleteHome({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const mine = (clients ?? []).filter((c) => c.athlete_user_id === userId);

  useEffect(() => {
    const only = mine[0];
    if (mine.length === 1 && only) navigate({ to: "/clienti/$clientId", params: { clientId: only.id }, replace: true });
  }, [mine, navigate]);

  if (isLoading || mine.length === 1) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {mine.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center">
          <h1 className="text-2xl font-semibold">La tua cartella non è ancora pronta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chiedi al tuo coach di creare la tua cartella con l'email con cui ti sei registrato.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Le tue cartelle</h1>
          <div className="mt-6 grid gap-3">
            {mine.map((c) => (
              <Link key={c.id} to="/clienti/$clientId" params={{ clientId: c.id }} className="glass rounded-xl p-5 hover:border-primary/50">
                <p className="font-display text-lg font-semibold">{c.full_name}</p>
                <p className="text-sm text-muted-foreground">{c.sport}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
