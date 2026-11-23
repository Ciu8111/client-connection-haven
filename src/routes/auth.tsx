import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";
import { GoogleIcon } from "@/components/app/ProviderIcons";
import { useSessionUser } from "@/lib/auth";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => {
    const m = search["mode"];
    return m === "signup" || m === "forgot" || m === "signin" ? { mode: m } : {};
  },
  head: () => ({
    meta: [
      { title: "Accedi — S&C FP Hub" },
      { name: "description", content: "Accedi o crea il tuo account S&C FP Hub come coach o atleta." },
      { property: "og:title", content: "Accedi — S&C FP Hub" },
      { property: "og:description", content: "Accedi o crea il tuo account S&C FP Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: searchMode } = Route.useSearch();
  const mode: Mode = searchMode ?? "signin";
  const navigate = useNavigate();
  const user = useSessionUser();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setSentTo(email);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentTo(email);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Qualcosa è andato storto";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "Email o password non corretti"
          : msg.includes("already registered")
            ? "Esiste già un account con questa email"
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Accesso non riuscito, riprova");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const titles: Record<Mode, string> = {
    signin: "Bentornato",
    signup: "Crea il tuo account",
    forgot: "Recupera la password",
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-grid">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="glass w-full max-w-md animate-fade-up rounded-2xl p-6 sm:p-8">
          {sentTo ? (
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-icon-tile text-primary">
                <MailCheck className="size-6" />
              </span>
              <h1 className="mt-4 text-2xl font-semibold">Controlla la tua email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "forgot"
                  ? "Ti abbiamo inviato un link per scegliere una nuova password a "
                  : "Ti abbiamo inviato un link di conferma a "}
                <span className="font-medium text-foreground">{sentTo}</span>.
              </p>
              <Button variant="link" className="mt-4" onClick={() => setSentTo(null)}>
                Torna indietro
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Coach: crea il tuo spazio. Atleta: usa l'email che hai dato al tuo coach."
                  : mode === "forgot"
                    ? "Inserisci la tua email per ricevere il link."
                    : "Accedi alla tua area S&C FP Hub."}
              </p>

              {mode !== "forgot" && (
                <div className="mt-6 grid gap-2.5">
                  <Button type="button" variant="google" className="h-10 w-full" onClick={() => oauth("google")}>
                    <GoogleIcon />
                    Continua con Google
                  </Button>
                  <Button type="button" variant="outline" className="h-10 w-full" onClick={() => oauth("lovable")}>
                    <LovableMark />
                    Continua con Lovable
                  </Button>
                  <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    oppure
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} className={mode === "forgot" ? "mt-6 grid gap-4" : "grid gap-4"}>
                {mode === "signup" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Nome e cognome</Label>
                    <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {mode !== "forgot" && (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary hover:underline">
                          Password dimenticata?
                        </Link>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}
                <Button type="submit" variant="hero" className="h-10 w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Accedi" : mode === "signup" ? "Crea account" : "Invia link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    Hai già un account?{" "}
                    <Link to="/auth" className="font-medium text-primary hover:underline">
                      Accedi
                    </Link>
                  </>
                ) : (
                  <>
                    Non hai un account?{" "}
                    <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-primary hover:underline">
                      Registrati
                    </Link>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
