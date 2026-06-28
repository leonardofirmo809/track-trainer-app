import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { archiveRunnerActivePlans } from "@/lib/runner.functions";

export const Route = createFileRoute("/_authenticated/corredor/planilha/nova")({ component: NovaPlanilhaPage });

function NovaPlanilhaPage() {
  const navigate = useNavigate();
  const archiveFn = useServerFn(archiveRunnerActivePlans);
  const [archiving, setArchiving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (confirmed) {
      navigate({ to: "/corredor/onboarding" });
    }
  }, [confirmed, navigate]);

  async function handleConfirm() {
    setArchiving(true);
    try {
      await archiveFn();
      toast.success("Planilha anterior arquivada. Vamos montar a nova.");
      setConfirmed(true);
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha: ${msg}`);
      setArchiving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto pt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" /> Nova planilha
          </CardTitle>
          <CardDescription>
            Vamos arquivar sua planilha atual e abrir o assistente para criar uma nova. Você poderá escolher outro objetivo, nível ou refazer o teste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium mb-1">
              <AlertTriangle className="size-4 text-amber-600" /> Atenção
            </div>
            <p className="text-muted-foreground">
              Sua planilha atual (com customizações) será marcada como arquivada. Ela não será apagada, mas a nova será a sua planilha ativa.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate({ to: "/corredor" })} disabled={archiving}>
              <X /> Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleConfirm} disabled={archiving}>
              {archiving ? "Arquivando…" : "Continuar"} <RefreshCw />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
