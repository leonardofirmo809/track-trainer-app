import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type CoachBranding = {
  logoUrl: string | null;
  primary: string;
  secondary: string;
  coachName: string;
};

const DEFAULTS = { primary: "#0EA5E9", secondary: "#0F172A" };

export function useCoachBranding() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["coach-branding", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoachBranding> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, brand_logo_url, brand_primary_color, brand_secondary_color")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return {
        logoUrl: data?.brand_logo_url ?? null,
        primary: data?.brand_primary_color || DEFAULTS.primary,
        secondary: data?.brand_secondary_color || DEFAULTS.secondary,
        coachName: data?.full_name || user?.email || "Treinador",
      };
    },
  });
}
