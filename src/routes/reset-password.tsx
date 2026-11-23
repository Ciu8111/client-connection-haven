import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nuova password — S&C FP Hub" },
      { name: "description", content: "Scegli una nuova password per il tuo account S&C FP Hub." },
      { property: "og:title", content: "Nuova password — S&C FP Hub" },
      { property: "og:description", content: "Scegli una nuova password per il tuo account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Link scaduto o non valido. Richiedine uno nuovo.");
    toast.success("Password aggiornata");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-grid">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-6 sm:items-center sm:pt-0">
        <form onSubmit={onSubmit} className="glass grid w-full max-w-md gap-4 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Scegli una nuova password</h1>
          <div className="grid gap-1.5">
            <Label htmlFor="pw">Nuova password</Label>
            <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" disabled={busy}>
            Salva password
          </Button>
        </form>
      </main>
    </div>
  );
}
