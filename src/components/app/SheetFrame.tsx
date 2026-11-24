import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { buildSheetDocument, SHEET_TEMPLATE_URL, type SheetSeed, type SheetState } from "@/lib/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  mesocycleId: string;
  clientId: string;
  initialData: SheetState | null;
  seed: SheetSeed;
  canInsert: boolean;
  onSaved?: (at: Date) => void;
};

/** Hosts the training sheet in a sandboxed frame and saves every change to the folder. */
export function SheetFrame({ mesocycleId, clientId, initialData, seed, canInsert, onSaved }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const queryClient = useQueryClient();
  const [loaded, setLoaded] = useState(false);

  const { data: template } = useQuery({
    queryKey: ["sheet-template", SHEET_TEMPLATE_URL],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(SHEET_TEMPLATE_URL);
      if (!res.ok) throw new Error("Modulo non disponibile");
      return res.text();
    },
  });

  // Build once per mesocycle: saving must not reload the frame.
  const [initial] = useState(() => ({ data: initialData, seed }));
  const srcDoc = useMemo(
    () => (template ? buildSheetDocument(template, initial.data, initial.seed) : undefined),
    [template, initial],
  );

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      const frame = frameRef.current;
      if (!frame || ev.source !== frame.contentWindow) return;
      const msg = ev.data as { type?: string; state?: SheetState };
      if (msg?.type === "hub-sheet:ready") setLoaded(true);
      if (msg?.type !== "hub-sheet:save" || !msg.state) return;

      const reply = (type: string) => frame.contentWindow?.postMessage({ type }, "*");
      const { data, error } = await supabase
        .from("mesocycle_sheets")
        .update({ data: msg.state as Json })
        .eq("mesocycle_id", mesocycleId)
        .select("mesocycle_id");
      let failed = !!error;
      if (!error && (!data || data.length === 0)) {
        if (canInsert) {
          const { error: insErr } = await supabase
            .from("mesocycle_sheets")
            .insert({ mesocycle_id: mesocycleId, client_id: clientId, data: msg.state as Json });
          failed = !!insErr;
        } else failed = true;
      }
      reply(failed ? "hub-sheet:error" : "hub-sheet:saved");
      if (!failed) {
        onSaved?.(new Date());
        queryClient.invalidateQueries({ queryKey: ["sheets", clientId] });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mesocycleId, clientId, canInsert, onSaved, queryClient]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-sheet-surface">
      {!loaded && (
        <div className="absolute inset-0 grid gap-3 p-6">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}
      {srcDoc && (
        <iframe
          ref={frameRef}
          title="Scheda allenamento"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-downloads allow-modals allow-popups"
          className="block h-[calc(100vh-9.5rem)] min-h-[560px] w-full"
          onLoad={() => setTimeout(() => setLoaded(true), 300)}
        />
      )}
    </div>
  );
}
