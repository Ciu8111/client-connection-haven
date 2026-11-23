import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesPanel({ clientId, userId, isCoach }: { clientId: string; userId: string; isCoach: boolean }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const key = ["files", clientId];

  const { data: files, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_files")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async (list: File[]) => {
      for (const file of list) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${clientId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from("client-files").upload(path, file);
        if (error) throw error;
        const { error: rowErr } = await supabase
          .from("client_files")
          .insert({ client_id: clientId, name: file.name, storage_path: path, size_bytes: file.size });
        if (rowErr) throw rowErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast.success("File caricato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (f: { id: string; storage_path: string }) => {
      await supabase.storage.from("client-files").remove([f.storage_path]);
      const { error } = await supabase.from("client_files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("client-files").createSignedUrl(path, 60, { download: name });
    if (error || !data) return toast.error("Impossibile scaricare il file");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <section className="glass rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">Documenti, video e referti condivisi nella cartella.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) upload.mutate(list);
            e.target.value = "";
          }}
        />
        <Button variant="hero" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Carica file
        </Button>
      </div>
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-10" />
        </div>
      ) : !files?.length ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nessun file nella cartella.</p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString("it-IT")} · {formatSize(f.size_bytes)}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Scarica" onClick={() => download(f.storage_path, f.name)}>
                <Download />
              </Button>
              {(isCoach || f.uploaded_by === userId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Elimina"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(f)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
