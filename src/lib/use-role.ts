import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "coach" | "runner";

export function useRoles() {
  const { user } = useAuth();
  const userId = user?.id;
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setRoles([]); setLoadedFor(null); setLoading(false); return; }
    // Don't flip loading back to true (and unmount gated subtrees) if we already have roles for this user.
    if (loadedFor !== userId) setLoading(true);
    let cancel = false;
    supabase.from("user_roles").select("role").eq("user_id", userId).then(({ data, error }) => {
      if (cancel) return;
      if (error) {
        console.warn("[useRoles] failed to fetch user_roles:", error.message);
        setRoles([]);
      } else {
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
      }
      setLoadedFor(userId);
      setLoading(false);
    });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { roles, isAdmin: roles.includes("admin"), isCoach: roles.includes("coach"), isRunner: roles.includes("runner"), loading };
}
