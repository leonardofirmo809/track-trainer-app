import {
  DAY_ORDER, defaultDaysFor, WORKOUT_TYPES,
  type DayCode,
} from "./planilha-5km-data";

export type WorkoutLike = { code: string; type: string };

export type Assignment<T extends WorkoutLike = WorkoutLike> = { day: DayCode; workout: T | null };
export type DistributionResult<T extends WorkoutLike = WorkoutLike> = {
  assignments: Assignment<T>[];
  hasConsecutiveIntense: boolean;
  warnings: string[];
};

export type TypesMap = Record<string, { color: string; intense: boolean }>;

const KEEP_PRIORITY: Record<string, number> = {
  // Maior número = manter primeiro.
  "Longão": 100, "Base aeróbia": 95, "Simulado 5km": 90, "Simulado 10km": 90, "Teste 3km": 88,
  "Corrida Rápida Longa": 82,
  "Corrida Rápida": 80, "Subidas": 78, "Intervalado Longo": 76, "Intervalado Moderado": 76, "Intervalado Curto": 74,
  "Tempo Run": 60, "Progressivo": 55,
  "Regenerativo": 10,
};
function keepScore(wo: WorkoutLike): number {
  return KEEP_PRIORITY[wo.type] ?? 50;
}

function sortDays(days: DayCode[]): DayCode[] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

function dropToFit<T extends WorkoutLike>(workouts: T[], target: number): T[] {
  const list = [...workouts];
  while (list.length > target) {
    const i = list.findIndex((w) => w.type === "Regenerativo");
    if (i === -1) break;
    list.splice(i, 1);
  }
  while (list.length > target) {
    const counts = new Map<string, number>();
    list.forEach((w) => counts.set(w.type, (counts.get(w.type) ?? 0) + 1));
    const dup = list
      .map((w, idx) => ({ w, idx, dup: (counts.get(w.type) ?? 0) > 1, score: keepScore(w) }))
      .filter((x) => x.dup)
      .sort((a, b) => a.score - b.score)[0];
    if (!dup) break;
    list.splice(dup.idx, 1);
  }
  while (list.length > target) {
    const min = list
      .map((w, idx) => ({ idx, score: keepScore(w) }))
      .sort((a, b) => a.score - b.score)[0];
    list.splice(min.idx, 1);
  }
  return list;
}

export function distributeWeek<T extends WorkoutLike>(
  workouts: T[],
  selectedDays: DayCode[],
  level: 1 | 2,
  typesMap: TypesMap = WORKOUT_TYPES as unknown as TypesMap,
): DistributionResult<T> {
  const days = sortDays(selectedDays.length ? selectedDays : defaultDaysFor(level));
  const warnings: string[] = [];

  let chosen: T[];
  if (days.length === workouts.length) {
    chosen = [...workouts];
  } else if (days.length < workouts.length) {
    chosen = dropToFit(workouts, days.length);
    warnings.push(`Reduzido de ${workouts.length} para ${days.length} treinos (Regenerativos/duplicados removidos primeiro).`);
  } else {
    chosen = [...workouts];
  }

  const codeNum = (wo: T) => parseInt(wo.code.replace(/\D/g, ""), 10) || 0;
  chosen.sort((a, b) => codeNum(a) - codeNum(b));

  const assignments: Assignment<T>[] = days.map((d, i) => ({ day: d, workout: chosen[i] ?? null }));

  let hasConsecutiveIntense = false;
  for (let i = 0; i < assignments.length - 1; i++) {
    const a = assignments[i].workout;
    const b = assignments[i + 1].workout;
    if (a && b && typesMap[a.type]?.intense && typesMap[b.type]?.intense) {
      hasConsecutiveIntense = true;
      break;
    }
  }
  if (hasConsecutiveIntense) {
    warnings.push("Há treinos intensos em dias consecutivos.");
  }

  return { assignments, hasConsecutiveIntense, warnings };
}
