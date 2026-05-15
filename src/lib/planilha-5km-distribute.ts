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
  /** Treinos que não foram atribuídos a nenhum dia (manual ou por overflow). */
  unassigned: T[];
};

export type TypesMap = Record<string, { color: string; intense: boolean }>;

export type DistributeOptions = {
  /** Mapa code→DayCode (manual). Códigos com `null` ficam intencionalmente sem dia. */
  manualDayByCode?: Record<string, DayCode | null | undefined>;
  /** Quando true, NÃO descarta treinos: o que sobrar volta em `unassigned`. */
  noDrop?: boolean;
};

const KEEP_PRIORITY: Record<string, number> = {
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

function dropToFit<T extends WorkoutLike>(workouts: T[], target: number): { kept: T[]; dropped: T[] } {
  const list = [...workouts];
  const dropped: T[] = [];
  while (list.length > target) {
    const i = list.findIndex((w) => w.type === "Regenerativo");
    if (i === -1) break;
    dropped.push(list[i]);
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
    dropped.push(list[dup.idx]);
    list.splice(dup.idx, 1);
  }
  while (list.length > target) {
    const min = list
      .map((w, idx) => ({ idx, score: keepScore(w) }))
      .sort((a, b) => a.score - b.score)[0];
    dropped.push(list[min.idx]);
    list.splice(min.idx, 1);
  }
  return { kept: list, dropped };
}

export function distributeWeek<T extends WorkoutLike>(
  workouts: T[],
  selectedDays: DayCode[],
  level: 1 | 2,
  typesMap: TypesMap = WORKOUT_TYPES as unknown as TypesMap,
  opts: DistributeOptions = {},
): DistributionResult<T> {
  const days = sortDays(selectedDays.length ? selectedDays : defaultDaysFor(level));
  const warnings: string[] = [];
  const manual = opts.manualDayByCode ?? {};
  const hasManual = Object.values(manual).some((v) => v !== undefined);

  // Caminho NOVO: manual ou noDrop — nunca descartar silenciosamente.
  if (hasManual || opts.noDrop) {
    const dayToWo = new Map<DayCode, T>();
    const unassigned: T[] = [];
    const queue: T[] = [];

    // 1) Aplica atribuição manual primeiro
    for (const wo of workouts) {
      const m = manual[wo.code];
      if (m === null) {
        unassigned.push(wo);
      } else if (m && days.includes(m)) {
        if (dayToWo.has(m)) {
          // Conflito: mantém o primeiro, manda o novo para fila
          queue.push(wo);
        } else {
          dayToWo.set(m, wo);
        }
      } else {
        queue.push(wo);
      }
    }

    // 2) Preenche dias livres (em ordem) com treinos da fila (ordenados por código)
    const codeNum = (wo: T) => parseInt(wo.code.replace(/\D/g, ""), 10) || 0;
    queue.sort((a, b) => codeNum(a) - codeNum(b));
    for (const d of days) {
      if (dayToWo.has(d)) continue;
      const next = queue.shift();
      if (!next) break;
      dayToWo.set(d, next);
    }

    // 3) Sobra → unassigned
    unassigned.push(...queue);

    const assignments: Assignment<T>[] = days.map((d) => ({ day: d, workout: dayToWo.get(d) ?? null }));

    let hasConsecutiveIntense = false;
    for (let i = 0; i < assignments.length - 1; i++) {
      const a = assignments[i].workout;
      const b = assignments[i + 1].workout;
      if (a && b && typesMap[a.type]?.intense && typesMap[b.type]?.intense) {
        hasConsecutiveIntense = true;
        break;
      }
    }
    if (hasConsecutiveIntense) warnings.push("Há treinos intensos em dias consecutivos.");
    if (unassigned.length > 0) warnings.push(`${unassigned.length} treino(s) sem dia atribuído.`);

    return { assignments, hasConsecutiveIntense, warnings, unassigned };
  }

  // Caminho LEGADO: dropToFit (mantido para retrocompatibilidade do PDF/gráficos).
  let chosen: T[];
  let droppedList: T[] = [];
  if (days.length === workouts.length) {
    chosen = [...workouts];
  } else if (days.length < workouts.length) {
    const r = dropToFit(workouts, days.length);
    chosen = r.kept;
    droppedList = r.dropped;
    warnings.push(`Reduzido de ${workouts.length} para ${days.length} treinos.`);
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
  if (hasConsecutiveIntense) warnings.push("Há treinos intensos em dias consecutivos.");

  return { assignments, hasConsecutiveIntense, warnings, unassigned: droppedList };
}
