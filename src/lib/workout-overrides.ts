// Sistema de overrides de treinos para a planilha (Personalizar planilha).
// Os overrides ficam salvos em plan.payload.workoutOverrides e são aplicados
// ao catálogo estático antes da distribuição/render.
//
// Estrutura: { [phase]: { [weekIdx]: WeekOverride } }
// onde WeekOverride = { [originalCode]: WorkoutPatch, __removed?: string[], __added?: Workout[] }

import type { Workout, Item, Section, DayCode } from "./planilha-5km-data";

export type WorkoutPatch = {
  code?: string;
  type?: string;
  zones?: string[];
  sections?: Section[];
  note?: string | null;
};

const REMOVED_KEY = "__removed";
const ADDED_KEY = "__added";

export type WeekOverride = {
  [originalCode: string]: WorkoutPatch | string[] | Workout[] | undefined;
  __removed?: string[];
  __added?: Workout[];
};

export type WorkoutOverrides = Record<string, Record<string, WeekOverride>>;

export function getOverridesFromPayload(payload: unknown): WorkoutOverrides {
  if (!payload || typeof payload !== "object") return {};
  const ov = (payload as { workoutOverrides?: unknown }).workoutOverrides;
  if (!ov || typeof ov !== "object") return {};
  return ov as WorkoutOverrides;
}

function isReservedKey(key: string): boolean {
  return key === REMOVED_KEY || key === ADDED_KEY;
}

/** Retorna apenas os patches (ignora __removed/__added). */
export function getWeekPatches(weekObj: WeekOverride | undefined): Record<string, WorkoutPatch> {
  if (!weekObj) return {};
  const out: Record<string, WorkoutPatch> = {};
  for (const k of Object.keys(weekObj)) {
    if (!isReservedKey(k)) out[k] = weekObj[k] as WorkoutPatch;
  }
  return out;
}

export function getRemoved(weekObj: WeekOverride | undefined): string[] {
  return weekObj?.__removed ?? [];
}

export function getAdded(weekObj: WeekOverride | undefined): Workout[] {
  return weekObj?.__added ?? [];
}

/** Aplica overrides em uma lista de workouts (uma semana de uma fase). */
export function applyOverrides<T extends Workout>(
  workouts: T[],
  weekObj: WeekOverride | undefined,
): T[] {
  if (!weekObj) return workouts;
  const removed = new Set(getRemoved(weekObj));
  const patches = getWeekPatches(weekObj);
  const kept = workouts
    .filter((wo) => !removed.has(wo.code))
    .map((wo) => {
      const patch = patches[wo.code];
      if (!patch) return wo;
      return {
        ...wo,
        ...(patch.code !== undefined ? { code: patch.code } : {}),
        ...(patch.type !== undefined ? { type: patch.type as T["type"] } : {}),
        ...(patch.zones !== undefined ? { zones: patch.zones as T["zones"] } : {}),
        ...(patch.sections !== undefined ? { sections: patch.sections } : {}),
        ...(patch.note !== undefined ? { note: patch.note ?? undefined } : {}),
      } as T;
    });
  // Os adicionados entram como T (mesma forma do Workout).
  const added = getAdded(weekObj) as unknown as T[];
  return [...kept, ...added];
}

// ---------- Mutations (retornam novo objeto, com cleanup de chaves vazias) ----------

function cleanupWeek(weekObj: WeekOverride): WeekOverride | undefined {
  const hasPatch = Object.keys(weekObj).some((k) => !isReservedKey(k));
  const hasRemoved = (weekObj.__removed?.length ?? 0) > 0;
  const hasAdded = (weekObj.__added?.length ?? 0) > 0;
  if (!hasPatch && !hasRemoved && !hasAdded) return undefined;
  const next: WeekOverride = { ...weekObj };
  if (!hasRemoved) delete next.__removed;
  if (!hasAdded) delete next.__added;
  return next;
}

function withWeek(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  mutate: (week: WeekOverride) => WeekOverride,
): WorkoutOverrides {
  const pKey = String(phase);
  const wKey = String(weekIdx);
  const next: WorkoutOverrides = { ...overrides };
  const phaseObj = { ...(next[pKey] ?? {}) };
  const current: WeekOverride = { ...(phaseObj[wKey] ?? {}) };
  // Clona arrays
  if (current.__removed) current.__removed = [...current.__removed];
  if (current.__added) current.__added = [...current.__added];
  const after = cleanupWeek(mutate(current));
  if (!after) {
    delete phaseObj[wKey];
  } else {
    phaseObj[wKey] = after;
  }
  if (Object.keys(phaseObj).length === 0) delete next[pKey];
  else next[pKey] = phaseObj;
  return next;
}

/** Set/clear de um patch específico. */
export function setOverride(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
  patch: WorkoutPatch | null,
): WorkoutOverrides {
  return withWeek(overrides, phase, weekIdx, (week) => {
    if (patch === null) {
      delete week[originalCode];
    } else {
      week[originalCode] = patch;
    }
    return week;
  });
}

export function getPatch(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
): WorkoutPatch | undefined {
  const w = overrides[String(phase)]?.[String(weekIdx)];
  if (!w) return undefined;
  const v = w[originalCode];
  if (!v || isReservedKey(originalCode)) return undefined;
  return v as WorkoutPatch;
}

/** Marca um treino do catálogo como removido nesta semana. Também limpa qualquer patch dele. */
export function removeWorkout(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
): WorkoutOverrides {
  return withWeek(overrides, phase, weekIdx, (week) => {
    delete week[originalCode];
    const removed = week.__removed ?? [];
    if (!removed.includes(originalCode)) removed.push(originalCode);
    week.__removed = removed;
    return week;
  });
}

export function restoreRemovedWorkout(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
): WorkoutOverrides {
  return withWeek(overrides, phase, weekIdx, (week) => {
    week.__removed = (week.__removed ?? []).filter((c) => c !== originalCode);
    return week;
  });
}

/** Adiciona um treino novo na semana. Retorna {overrides, index} (index dentro de __added). */
export function addWorkout(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  workout: Workout,
): { overrides: WorkoutOverrides; index: number } {
  let newIndex = -1;
  const next = withWeek(overrides, phase, weekIdx, (week) => {
    const added = week.__added ?? [];
    added.push(workout);
    newIndex = added.length - 1;
    week.__added = added;
    return week;
  });
  return { overrides: next, index: newIndex };
}

export function updateAddedWorkout(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  index: number,
  workout: Workout,
): WorkoutOverrides {
  return withWeek(overrides, phase, weekIdx, (week) => {
    const added = week.__added ?? [];
    if (index >= 0 && index < added.length) added[index] = workout;
    week.__added = added;
    return week;
  });
}

export function deleteAddedWorkout(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  index: number,
): WorkoutOverrides {
  return withWeek(overrides, phase, weekIdx, (week) => {
    const added = week.__added ?? [];
    added.splice(index, 1);
    week.__added = added;
    return week;
  });
}

export type { Item, Section, DayCode };
