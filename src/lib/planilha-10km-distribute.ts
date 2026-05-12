// Helpers de distribuição/validação dos dias da semana — Planilha 10km.
import type { DayCode } from "./planilha-5km-data";

export function slotCountFor10km(level: 1 | 2): number {
  return level === 1 ? 3 : 4;
}

export function allowedDayCounts10km(level: 1 | 2): number[] {
  return level === 1 ? [3] : [4, 5];
}

export function validateWeekDays10km(level: 1 | 2, weekDays: DayCode[]): string | null {
  const allowed = allowedDayCounts10km(level);
  if (!allowed.includes(weekDays.length)) {
    if (level === 1) return "Nível 1 exige exatamente 3 dias de treino.";
    return "Nível 2 exige 4 ou 5 dias de treino.";
  }
  const set = new Set(weekDays);
  if (set.size !== weekDays.length) return "Há dias duplicados na seleção.";
  return null;
}
