import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FolderLock, LineChart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";
import { useSessionUser } from "@/lib/auth";

const HERO =
  "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "S&C FP Hub — Una cartella per ogni atleta" },
      {
        name: "description",
        content:
          "Organizza i clienti, pubblica i mesocicli e lascia che ogni atleta compili i propri dati — vedendo solo ciò che è suo.",
      },
      { property: "og:title", content: "S&C FP Hub — Una cartella per ogni atleta" },
      {
        property: "og:description",
        content: "Schede, mesocicli, grafici e avvisi PR per coach di Strength & Conditioning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: HERO },
      { name: "twitter:image", content: HERO },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: FolderLock,
    title: "Una cartella per cliente",
    text: "Ogni atleta accede solo alla sua cartella: schede, file e progressi.",
  },
  {
    icon: LineChart,
    title: "La tua scheda, identica",
    text: "Il Modulo Professionale Dinamico v6 con grafici, e1RM, antropometria e salti.",
  },
  {
    icon: Trophy,
    title: "Avvisi PR in tempo reale",
    text: "La campanella ti avvisa quando un cliente compila o batte un record.",
  },
];

function Index() {
  const user = useSessionUser();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 bg-grid" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <Logo />
          {user ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Vai alla dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Accedi</Link>
            </Button>
          )}
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <section className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Strength &amp; Conditioning
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Le tue schede.
              <br />
              <span className="text-primary">Una cartella</span> per ogni atleta.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Organizza i clienti, pubblica i mesocicli e lascia che ogni atleta compili i propri dati —
              vedendo solo ciò che è suo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Crea il tuo account <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link to="/auth">Ho già un account</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Sei un atleta? Registrati con l'email che hai comunicato al tuo coach.
            </p>
          </section>

          <section className="space-y-3">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="glass animate-fade-up flex gap-4 rounded-xl p-5"
                style={{ animationDelay: `${150 + i * 100}ms` }}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-icon-tile text-primary">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">{f.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
