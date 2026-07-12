import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PlanSource } from "@/lib/plan-to-weeks";
import { clearPlanAdvancedCustomization } from "@/lib/plan-customization.functions";

const SOURCE_LABEL: Record<PlanSource, string> = {
  base: "Modelo metodológico",
  adjusted: "Modelo com ajustes",
  advanced: "Editor avançado ativo",
};

/** Selo compacto indicando qual fonte está vencendo na grade semanal deste plano. */
export function PlanSourceBadge({ source }: { source: PlanSource }) {
  if (source === "advanced") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-300">
        <Sparkles className="size-3" /> {SOURCE_LABEL[source]}
      </Badge>
    );
  }
  return (
    <Badge variant={source === "adjusted" ? "secondary" : "outline"}>
      {SOURCE_LABEL[source]}
    </Badge>
  );
}

/**
 * Aviso exibido quando payload.customization.weeks está ativo: explica que o
 * "Ajustar modelo" não reflete no aluno enquanto essa personalização existir, e
 * oferece uma remoção controlada (só do snapshot do Editor avançado).
 */
export function PlanAdvancedCustomizationNotice({
  planId,
  onCleared,
}: {
  planId: string;
  onCleared: () => void;
}) {
  const clearFn = useServerFn(clearPlanAdvancedCustomization);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function confirmRemove() {
    setRemoving(true);
    try {
      await clearFn({ data: { planId } });
      toast.success("Personalização avançada removida.");
      setConfirmOpen(false);
      onCleared();
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao remover personalização avançada: ${msg}`);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-amber-600" /> Editor avançado ativo
      </div>
      <p className="text-muted-foreground">
        Este plano possui uma personalização avançada ativa. O aluno está vendo a versão do Editor avançado.
        Para usar o Ajustar modelo, remova a personalização avançada.
      </p>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        Remover personalização avançada
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover personalização avançada?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga apenas a versão salva pelo Editor avançado. O aluno passa a ver o modelo metodológico
              (com os ajustes feitos em "Ajustar modelo", se houver). Nível, dias da semana, fase e ajustes
              pontuais não são afetados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={removing}>
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
