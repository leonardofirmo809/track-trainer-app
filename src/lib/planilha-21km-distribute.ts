// Validação de dias da Planilha 21km — sugestão de 4 dias, mas livre.
import type { DayCode } from "./planilha-5km-data";

export function slotCountFor21km(_level: 1 | 2): number { return 4; }

export function validateWeekDays21km(_level: 1 | 2, weekDays: DayCode[]): string | null {
  if (weekDays.length < 2) return "Selecione entre 2 e 7 dias de treino.";
  if (weekDays.length > 7) return "Selecione no máximo 7 dias de treino.";
  const set = new Set(weekDays);
  if (set.size !== weekDays.length) return "Há dias duplicados na seleção.";
  return null;
}

export function softDayCountMessage21km(_level: 1 | 2, weekDays: DayCode[]): string | null {
  const suggested = 4;
  const n = weekDays.length;
  if (n === 0 || n === suggested) return null;
  if (n > suggested) {
    return `Sugestão: ${suggested} dias. Os ${n - suggested} dia(s) extras ficarão como descanso.`;
  }
  return `Sugestão: ${suggested} dias. Os treinos que sobrarem ficarão na bandeja "Treinos sem dia" do Ajustar modelo.`;
}
