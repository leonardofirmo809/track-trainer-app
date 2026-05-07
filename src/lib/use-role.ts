import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "coach";

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data, error }) => {
      if (cancel) return;
      if (error) {
        console.warn("[useRoles] failed to fetch user_roles:", error.message);
        setRoles([]);
      } else {
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
      }
      setLoading(false);
    });
    return () => { cancel = true; };
  }, [user]);

  return { roles, isAdmin: roles.includes("admin"), loading };
}
