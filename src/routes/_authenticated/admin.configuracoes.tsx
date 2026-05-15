import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings as SettingsIcon, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxCoaches, setMaxCoaches] = useState<string>("4");
  const [activeCount, setActiveCount] = useState(0);

  const load = async () => {
    setLoading(true);
    const [settingRes, rolesRes] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "max_coaches").maybeSingle(),
      supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "coach"),
    ]);
    if (settingRes.error) toast.error(settingRes.error.message);
    setMaxCoaches(settingRes.data?.value ?? "4");
    setActiveCount(rolesRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parsed = parseInt(maxCoaches, 10);
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 1000;
  const belowActive = valid && parsed < activeCount;

  const save = async () => {
    if (!valid) return toast.error("Informe um número entre 1 e 1000.");
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: String(parsed), updated_at: new Date().toISOString() })
      .eq("key", "max_coaches");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas.");
    load();
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <SettingsIcon className="size-7" /> Configurações
        </h1>
        <p className="text-muted-foreground">Parâmetros gerais do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limite de treinadores</CardTitle>
          <CardDescription>
            Número máximo de treinadores ativos permitidos no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Treinadores ativos no momento: <span className="font-medium text-foreground">{activeCount}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max">Máximo de treinadores</Label>
            <Input
              id="max"
              type="number"
              min={1}
              max={1000}
              value={maxCoaches}
              onChange={(e) => setMaxCoaches(e.target.value)}
              disabled={loading}
            />
          </div>
          {belowActive && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>
                O novo limite ({parsed}) é menor que o número atual de treinadores ativos ({activeCount}).
                Ninguém será removido, mas novos cadastros ficarão bloqueados até reduzir o número de treinadores.
              </span>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || loading || !valid}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
