import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Client-side session user (null when signed out, undefined while loading). */
export function useSessionUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Non autenticato");
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
        supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
      ]);
      const roleList = (roles ?? []).map((r) => r.role);
      return {
        user: data.user,
        profile,
        isCoach: roleList.includes("coach"),
        isAthlete: roleList.includes("athlete"),
      };
    },
  });
}
