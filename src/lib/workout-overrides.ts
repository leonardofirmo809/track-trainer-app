// Sistema de overrides de treinos para a planilha (Personalizar planilha).
// Os overrides ficam salvos em plan.payload.workoutOverrides e são aplicados
// ao catálogo estático antes da distribuição/render.
//
// Estrutura: { [phase]: { [weekIdx]: { [originalCode]: Partial<Workout> } } }

import type { Workout, Item, Section } from "./planilha-5km-data";

export type WorkoutPatch = {
  code?: string;
  type?: string;
  zones?: string[];
  sections?: Section[];
  note?: string | null;
};

export type WorkoutOverrides = Record<string, Record<string, Record<string, WorkoutPatch>>>;

export function getOverridesFromPayload(payload: unknown): WorkoutOverrides {
  if (!payload || typeof payload !== "object") return {};
  const ov = (payload as { workoutOverrides?: unknown }).workoutOverrides;
  if (!ov || typeof ov !== "object") return {};
  return ov as WorkoutOverrides;
}

/** Aplica overrides em uma lista de workouts (uma semana de uma fase). */
export function applyOverrides<T extends Workout>(
  workouts: T[],
  overridesForWeek: Record<string, WorkoutPatch> | undefined,
): T[] {
  if (!overridesForWeek) return workouts;
  return workouts.map((wo) => {
    const patch = overridesForWeek[wo.code];
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
}

/** Set/clear de um patch específico, retornando novo objeto de overrides. */
export function setOverride(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
  patch: WorkoutPatch | null,
): WorkoutOverrides {
  const pKey = String(phase);
  const wKey = String(weekIdx);
  const next: WorkoutOverrides = { ...overrides };
  const phaseObj = { ...(next[pKey] ?? {}) };
  const weekObj = { ...(phaseObj[wKey] ?? {}) };
  if (patch === null) {
    delete weekObj[originalCode];
  } else {
    weekObj[originalCode] = patch;
  }
  if (Object.keys(weekObj).length === 0) {
    delete phaseObj[wKey];
  } else {
    phaseObj[wKey] = weekObj;
  }
  if (Object.keys(phaseObj).length === 0) {
    delete next[pKey];
  } else {
    next[pKey] = phaseObj;
  }
  return next;
}

export function getPatch(
  overrides: WorkoutOverrides,
  phase: number | string,
  weekIdx: number,
  originalCode: string,
): WorkoutPatch | undefined {
  return overrides[String(phase)]?.[String(weekIdx)]?.[originalCode];
}

export type { Item, Section };
