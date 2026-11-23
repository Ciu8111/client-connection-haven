import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, ClipboardCheck, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationBell({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const key = ["notifications", userId];

  const { data: items = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as { title: string; body: string | null; type: string };
          if (n.type === "pr") toast.success(n.title, { description: n.body ?? undefined, icon: "🏆" });
          else toast(n.title, { description: n.body ?? undefined });
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (!unread) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: key });
  }

  return (
    <Popover onOpenChange={(open) => !open && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifiche" className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display font-semibold">Notifiche</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Segna come lette
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nessuna notifica. Ti avviseremo quando un atleta compila la scheda o batte un record.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => n.client_id && navigate({ to: "/clienti/$clientId", params: { clientId: n.client_id } })}
                className={cn(
                  "flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent",
                  !n.read_at && "bg-icon-tile",
                )}
              >
                <span className="mt-0.5 text-primary">
                  {n.type === "pr" ? <Trophy className="size-4" /> : <ClipboardCheck className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
