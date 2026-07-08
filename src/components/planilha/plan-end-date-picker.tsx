import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updatePlanEndDate } from "@/lib/plan-customization.functions";

function parseIsoDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  // Aceita "yyyy-mm-dd" ou ISO completo
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T00:00:00") : new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type PlanEndDatePickerProps = {
  /** ID do plano salvo. Quando ausente, o campo fica desabilitado. */
  planId: string | null | undefined;
  /** end_date salvo no banco (yyyy-mm-dd). Ausente = treino sem término definido. */
  initialEndDate: string | null | undefined;
  /** Chave do React Query a invalidar após salvar (para recarregar o plano). */
  invalidateQueryKey?: readonly unknown[];
  /** Notifica o componente pai do valor atual em yyyy-mm-dd (ou null se limpo). */
  onChange?: (iso: string | null) => void;
};

export function PlanEndDatePicker({
  planId,
  initialEndDate,
  invalidateQueryKey,
  onChange,
}: PlanEndDatePickerProps) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updatePlanEndDate);

  const [date, setDate] = useState<Date | undefined>(() => parseIsoDate(initialEndDate));
  const [saving, setSaving] = useState(false);

  // Mantém o valor sincronizado quando o plano é carregado/atualizado.
  useEffect(() => {
    setDate(parseIsoDate(initialEndDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEndDate]);

  async function persist(iso: string | null): Promise<boolean> {
    if (!planId) return false;
    setSaving(true);
    try {
      await updateFn({ data: { planId, endDate: iso } });
      onChange?.(iso);
      if (invalidateQueryKey) qc.invalidateQueries({ queryKey: invalidateQueryKey });
      return true;
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar data: ${msg}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSelect(d: Date | undefined) {
    if (!d) return;
    const previous = date;
    setDate(d);
    if (!(await persist(toIsoDate(d)))) setDate(previous);
  }

  async function handleClear() {
    const previous = date;
    setDate(undefined);
    if (!(await persist(null))) setDate(previous);
  }

  return (
    <Popover>
      <div className="inline-flex items-stretch">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Data de término do treino"
            title={!planId ? "Salve a planilha primeiro" : "Data de término do treino"}
            className={cn(
              "justify-start text-left font-normal",
              date && "rounded-r-none border-r-0",
              !date && "text-muted-foreground",
            )}
            disabled={!planId}
          >
            <CalendarIcon className="mr-2 size-4" />
            Término: {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "não definido"}
            {saving && <span className="ml-2 text-xs text-muted-foreground">salvando…</span>}
          </Button>
        </PopoverTrigger>
        {date && !saving && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Limpar data de término"
            title="Limpar data de término"
            className="rounded-l-none px-2"
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
