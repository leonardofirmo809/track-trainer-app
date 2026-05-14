// Validação de dias da Planilha 42km — sempre 4 dias para qualquer nível.
import type { DayCode } from "./planilha-5km-data";

export function slotCountFor42km(_level: 1 | 2): number { return 4; }
export function allowedDayCounts42km(_level: 1 | 2): number[] { return [4]; }

export function validateWeekDays42km(_level: 1 | 2, weekDays: DayCode[]): string | null {
  if (weekDays.length !== 4) return "Selecione exatamente 4 dias de treino.";
  const set = new Set(weekDays);
  if (set.size !== weekDays.length) return "Há dias duplicados na seleção.";
  return null;
}
