import {
  DAY_ORDER, defaultDaysFor, workoutDurationMinutes, WORKOUT_TYPES,
  type DayCode, type Workout,
} from "./planilha-5km-data";

export type Assignment = { day: DayCode; workout: Workout | null };
export type DistributionResult = {
  assignments: Assignment[];
  hasConsecutiveIntense: boolean;
  warnings: string[];
};

const KEEP_PRIORITY: Record<string, number> = {
  // Maior número = manter primeiro.
  "Longão": 100, "Base aeróbia": 95, "Simulado 5km": 90, "Teste 3km": 88,
  "Corrida Rápida": 80, "Subidas": 78, "Intervalado Longo": 76, "Intervalado Curto": 74,
  "Tempo Run": 60, "Progressivo": 55,
  "Regenerativo": 10,
};
function keepScore(wo: Workout): number {
  return KEEP_PRIORITY[wo.type] ?? 50;
}

function sortDays(days: DayCode[]): DayCode[] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

function dropToFit(workouts: Workout[], target: number): Workout[] {
  const list = [...workouts];
  // 1) remover Regenerativos primeiro
  while (list.length > target) {
    const i = list.findIndex((w) => w.type === "Regenerativo");
    if (i === -1) break;
    list.splice(i, 1);
  }
  // 2) remover duplicados do mesmo tipo (menor prioridade primeiro)
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
  // 3) último recurso: remover por menor prioridade
  while (list.length > target) {
    const min = list
      .map((w, idx) => ({ idx, score: keepScore(w) }))
      .sort((a, b) => a.score - b.score)[0];
    list.splice(min.idx, 1);
  }
  return list;
}

export function distributeWeek(
  workouts: Workout[],
  selectedDays: DayCode[],
  level: 1 | 2,
): DistributionResult {
  const days = sortDays(selectedDays.length ? selectedDays : defaultDaysFor(level));
  const warnings: string[] = [];

  let chosen: Workout[];
  if (days.length === workouts.length) {
    chosen = [...workouts];
  } else if (days.length < workouts.length) {
    chosen = dropToFit(workouts, days.length);
    warnings.push(`Reduzido de ${workouts.length} para ${days.length} treinos (Regenerativos/duplicados removidos primeiro).`);
  } else {
    chosen = [...workouts];
  }

  // Treino mais longo no último dia
  if (chosen.length > 1) {
    let longestIdx = 0;
    let longestVal = workoutDurationMinutes(chosen[0]);
    for (let i = 1; i < chosen.length; i++) {
      const v = workoutDurationMinutes(chosen[i]);
      if (v > longestVal) { longestVal = v; longestIdx = i; }
    }
    if (longestIdx !== chosen.length - 1) {
      const [longest] = chosen.splice(longestIdx, 1);
      chosen.push(longest);
    }
  }

  const assignments: Assignment[] = days.map((d, i) => ({ day: d, workout: chosen[i] ?? null }));

  // Detecta intensos consecutivos
  let hasConsecutiveIntense = false;
  for (let i = 0; i < assignments.length - 1; i++) {
    const a = assignments[i].workout;
    const b = assignments[i + 1].workout;
    if (a && b && WORKOUT_TYPES[a.type].intense && WORKOUT_TYPES[b.type].intense) {
      hasConsecutiveIntense = true;
      break;
    }
  }
  if (hasConsecutiveIntense) {
    warnings.push("Há treinos intensos em dias consecutivos.");
  }

  return { assignments, hasConsecutiveIntense, warnings };
}
