// Helpers de sugestão/validação dos dias da semana — Planilha 10km.
// A regra fixa virou apenas SUGESTÃO: o treinador pode escolher qualquer
// quantidade de dias (>=1). A função de validação só bloqueia quando 0 dias.
import type { DayCode } from "./planilha-5km-data";

export function slotCountFor10km(level: 1 | 2): number {
  return level === 1 ? 3 : 4;
}

/** Sugestão de dias por semana (não obrigatório). */
export function suggestedDayCount10km(level: 1 | 2): number {
  return level === 1 ? 3 : 4;
}

/** Mantida para compat; agora retorna apenas a contagem sugerida. */
export function allowedDayCounts10km(level: 1 | 2): number[] {
  return level === 1 ? [3] : [4, 5];
}

export function validateWeekDays10km(_level: 1 | 2, weekDays: DayCode[]): string | null {
  if (weekDays.length === 0) return "Selecione pelo menos 1 dia de treino.";
  const set = new Set(weekDays);
  if (set.size !== weekDays.length) return "Há dias duplicados na seleção.";
  return null;
}

/** Mensagem suave (não bloqueia) quando a contagem difere da sugestão. */
export function softDayCountMessage10km(level: 1 | 2, weekDays: DayCode[]): string | null {
  const suggested = suggestedDayCount10km(level);
  const n = weekDays.length;
  if (n === 0 || n === suggested) return null;
  if (n > suggested) {
    return `Sugestão para Nível ${level}: ${suggested} dias. Os ${n - suggested} dia(s) extras ficarão como descanso (ou adicione treinos novos no Personalizar planilha).`;
  }
  return `Sugestão para Nível ${level}: ${suggested} dias. Você selecionou menos — os treinos que sobrarem ficarão na bandeja "Treinos sem dia" do Personalizar planilha.`;
}
