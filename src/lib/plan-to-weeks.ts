import type { DayOfWeek, TrainingSession, WeekPlan } from "./training-session-types";
import { DAYS_OF_WEEK, emptyDays, recalcSummary } from "./training-session-types";
import { sessionLibrary } from "./session-library";
import { newSessionId } from "./training-store";

/**
 * Best-effort adapter to derive WeekPlan[] from an arbitrary training_plans.payload.
 * Falls back to an empty 4-week skeleton if the payload shape is unknown.
 */
export function planPayloadToWeeks(payload: unknown, fallbackWeeks = 4): WeekPlan[] {
  if (!payload || typeof payload !== "object") return blankWeeks(fallbackWeeks);

  const p = payload as Record<string, unknown>;

  // If a previous customization exists, prefer it.
  const customization = p.customization as { weeks?: WeekPlan[] } | undefined;
  if (customization?.weeks && Array.isArray(customization.weeks) && customization.weeks.length > 0) {
    return customization.weeks.map(normalizeWeek);
  }

  // Try to discover an array of weeks at common keys.
  const candidateWeeks =
    (p.weeks as unknown[] | undefined) ??
    (p.semanas as unknown[] | undefined) ??
    null;

  if (Array.isArray(candidateWeeks) && candidateWeeks.length > 0) {
    return candidateWeeks.map((w, idx) => weekFromArbitrary(w, idx));
  }

  return blankWeeks(fallbackWeeks);
}

function normalizeWeek(w: WeekPlan): WeekPlan {
  const days = { ...emptyDays(), ...w.days };
  return { weekNumber: w.weekNumber, days, summary: recalcSummary(days) };
}

function blankWeeks(n: number): WeekPlan[] {
  return Array.from({ length: n }, (_, i) => {
    const days = emptyDays();
    return { weekNumber: i + 1, days, summary: recalcSummary(days) };
  });
}

function weekFromArbitrary(raw: unknown, idx: number): WeekPlan {
  const days = emptyDays();
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    // Pattern A: { days: { SEG: {...} } }
    const ds = (r.days ?? r.dias) as Record<string, unknown> | undefined;
    if (ds && typeof ds === "object") {
      for (const day of DAYS_OF_WEEK) {
        const v = ds[day];
        if (v) days[day] = arbitraryToSession(v);
      }
    }
    // Pattern B: { trainings: [{ day, ... }] }
    const list = (r.trainings ?? r.treinos) as unknown[] | undefined;
    if (Array.isArray(list)) {
      for (const t of list) {
        if (t && typeof t === "object") {
          const day = (t as { day?: DayOfWeek }).day;
          if (day && DAYS_OF_WEEK.includes(day)) days[day] = arbitraryToSession(t);
        }
      }
    }
  }
  return { weekNumber: idx + 1, days, summary: recalcSummary(days) };
}

function arbitraryToSession(raw: unknown): TrainingSession {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const code = String(r.code ?? r.codigo ?? "").trim();

  // Try to match library by code first.
  if (code) {
    const match = sessionLibrary.find((s) => s.code === code);
    if (match) return { ...match, id: newSessionId(), isCustom: false };
  }

  return {
    id: newSessionId(),
    code: code || "CUSTOM",
    name: String(r.name ?? r.nome ?? "Treino"),
    type: "CUSTOM",
    intensity: (r.intensity as TrainingSession["intensity"]) ?? "low",
    duration: typeof r.duration === "number" ? r.duration : null,
    distance: typeof r.distance === "number" ? r.distance : null,
    zones: { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 },
    ratioL: 1,
    ratioMH: 0,
    description: String(r.description ?? ""),
    structure: [],
    isCustom: true,
    tags: [],
  };
}
