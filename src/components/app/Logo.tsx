import { Link } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Dumbbell className="size-5 -rotate-45" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">S&amp;C FP Hub</span>
    </Link>
  );
}
