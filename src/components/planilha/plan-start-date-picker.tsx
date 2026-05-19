import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updatePlanStartDate } from "@/lib/plan-customization.functions";

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

export type PlanStartDatePickerProps = {
  /** ID do plano salvo. Quando ausente, o campo fica desabilitado. */
  planId: string | null | undefined;
  /** start_date salvo no banco (yyyy-mm-dd) — fallback usado se vazio. */
  initialStartDate: string | null | undefined;
  /** Fallback quando ainda não há start_date salvo (ex.: created_at do plano). */
  fallbackDate: string | null | undefined;
  /** Chave do React Query a invalidar após salvar (para recarregar o plano). */
  invalidateQueryKey?: readonly unknown[];
  /** Notifica o componente pai do valor atual em yyyy-mm-dd. */
  onChange?: (iso: string) => void;
};

export function PlanStartDatePicker({
  planId,
  initialStartDate,
  fallbackDate,
  invalidateQueryKey,
  onChange,
}: PlanStartDatePickerProps) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updatePlanStartDate);

  const initial = parseIsoDate(initialStartDate) ?? parseIsoDate(fallbackDate) ?? new Date();
  const [date, setDate] = useState<Date>(initial);
  const [saving, setSaving] = useState(false);

  // Mantém o valor sincronizado quando o plano é carregado/atualizado.
  useEffect(() => {
    const next = parseIsoDate(initialStartDate) ?? parseIsoDate(fallbackDate);
    if (next) setDate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStartDate, fallbackDate]);

  useEffect(() => {
    onChange?.(toIsoDate(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleSelect(d: Date | undefined) {
    if (!d) return;
    setDate(d);
    if (!planId) return;
    setSaving(true);
    try {
      await updateFn({ data: { planId, startDate: toIsoDate(d) } });
      if (invalidateQueryKey) qc.invalidateQueries({ queryKey: invalidateQueryKey });
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar data: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Data de início do treino"
          title={!planId ? "Salve a planilha primeiro" : "Data de início do treino"}
          className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
          disabled={!planId}
        >
          <CalendarIcon className="mr-2 size-4" />
          Início: {format(date, "dd/MM/yyyy", { locale: ptBR })}
          {saving && <span className="ml-2 text-xs text-muted-foreground">salvando…</span>}
        </Button>
      </PopoverTrigger>
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

