import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Mail, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { MesocyclesPanel } from "@/components/app/MesocyclesPanel";
import { RecordsPanel } from "@/components/app/RecordsPanel";
import { FilesPanel } from "@/components/app/FilesPanel";

export const Route = createFileRoute("/_authenticated/clienti/$clientId/")({
  head: () => ({
    meta: [
      { title: "Cartella atleta — S&C FP Hub" },
      { name: "description", content: "Schede, record e file dell'atleta." },
      { property: "og:title", content: "Cartella atleta — S&C FP Hub" },
      { property: "og:description", content: "Schede, record e file dell'atleta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientFolder,
});

function ClientFolder() {
  const { clientId } = Route.useParams();
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cartella eliminata");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !me) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-72" />
      </div>
    );
  }
  if (!client) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Cartella non trovata</h1>
        <Button asChild variant="link">
          <Link to="/dashboard">Torna alla dashboard</Link>
        </Button>
      </div>
    );
  }

  const isCoach = client.coach_id === me.user.id;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {isCoach && (
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Tutti gli atleti
        </Link>
      )}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {isCoach ? "Cartella atleta" : "La tua cartella"}
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{client.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-4" /> {client.email}
            </span>
            {client.sport && <Badge variant="outline">{client.sport}</Badge>}
            {isCoach &&
              (client.athlete_user_id ? (
                <Badge variant="secondary" className="gap-1">
                  <UserCheck className="size-3" /> Account attivo
                </Badge>
              ) : (
                <Badge variant="outline">In attesa di registrazione</Badge>
              ))}
          </div>
          {isCoach && client.notes && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{client.notes}</p>}
        </div>
        {isCoach && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <Trash2 /> Elimina cartella
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare la cartella di {client.full_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno eliminati definitivamente tutti i mesocicli, le schede e i file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>Elimina</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs defaultValue="schede" className="mt-8">
        <TabsList className="h-10">
          <TabsTrigger value="schede" className="px-4">Schede</TabsTrigger>
          <TabsTrigger value="record" className="px-4">Record</TabsTrigger>
          <TabsTrigger value="file" className="px-4">File</TabsTrigger>
        </TabsList>
        <TabsContent value="schede" className="mt-5">
          <MesocyclesPanel clientId={client.id} clientName={client.full_name} isCoach={isCoach} />
        </TabsContent>
        <TabsContent value="record" className="mt-5">
          <RecordsPanel clientId={client.id} />
        </TabsContent>
        <TabsContent value="file" className="mt-5">
          <FilesPanel clientId={client.id} userId={me.user.id} isCoach={isCoach} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
