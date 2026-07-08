import type { DayOfWeek, TrainingSession, WeekPlan } from "./training-session-types";
import { DAYS_OF_WEEK } from "./training-session-types";
import { planPayloadToWeeks } from "./plan-to-weeks";

export type RunnerWeekChip = {
  dayKey: DayOfWeek;
  date: Date;
  session: TrainingSession | null;
  isToday: boolean;
  isPast: boolean;
};

export type RunnerTodaySnapshot = {
  todayDate: Date;
  todayDayKey: DayOfWeek;
  phase: number;             // 1..4 (currentPhase)
  weekNumber: number;        // 1..4 within phase
  todaySession: TrainingSession | null;
  nextSession: { dayKey: DayOfWeek; date: Date; session: TrainingSession } | null;
  weekChips: RunnerWeekChip[];
  weeks: WeekPlan[];
  hasPlan: boolean;
};

const JS_DAY_TO_KEY: Record<number, DayOfWeek> = {
  0: "DOM", 1: "SEG", 2: "TER", 3: "QUA", 4: "QUI", 5: "SEX", 6: "SAB",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow; // back to Monday
  x.setDate(x.getDate() + offset);
  return x;
}

export function buildRunnerToday(
  payload: unknown,
  startDate: string | null,
  createdAt: string,
  planType?: string | null,
): RunnerTodaySnapshot {
  const today = startOfDay(new Date());
  const todayKey = JS_DAY_TO_KEY[today.getDay()];

  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const currentPhase = (() => {
    const v = p.currentPhase;
    return typeof v === "number" && v >= 1 && v <= 4 ? v : 1;
  })();

  const weeks = planPayloadToWeeks(payload, 4, planType);
  const hasPlan = weeks.some((w) => Object.values(w.days).some(Boolean));

  // Anchor: Monday of the week that contains start_date (or created_at)
  const anchor = mondayOf(new Date(startDate ?? createdAt));
  const daysSinceAnchor = Math.max(0, diffDays(today, anchor));
  const weekIdxAbs = Math.floor(daysSinceAnchor / 7);
  const weekNumber = Math.min(weeks.length, (weekIdxAbs % weeks.length) + 1);

  const currentWeek = weeks[weekNumber - 1] ?? weeks[0];
  const weekMonday = (() => {
    const m = new Date(anchor);
    m.setDate(m.getDate() + weekIdxAbs * 7);
    return m;
  })();

  const weekChips: RunnerWeekChip[] = DAYS_OF_WEEK.map((dayKey, i) => {
    const date = new Date(weekMonday);
    date.setDate(date.getDate() + i);
    const isToday = diffDays(date, today) === 0;
    return {
      dayKey,
      date,
      session: currentWeek?.days[dayKey] ?? null,
      isToday,
      isPast: diffDays(date, today) < 0,
    };
  });

  const todaySession = currentWeek?.days[todayKey] ?? null;

  // Find next session strictly after today across remaining weeks (up to 14 days ahead)
  let nextSession: RunnerTodaySnapshot["nextSession"] = null;
  for (let offset = 1; offset <= 14; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const daysFromAnchor = diffDays(d, anchor);
    const wIdx = Math.floor(daysFromAnchor / 7) % weeks.length;
    const w = weeks[wIdx];
    if (!w) continue;
    const key = JS_DAY_TO_KEY[d.getDay()];
    const s = w.days[key];
    if (s) {
      nextSession = { dayKey: key, date: d, session: s };
      break;
    }
  }

  return {
    todayDate: today,
    todayDayKey: todayKey,
    phase: currentPhase,
    weekNumber,
    todaySession,
    nextSession,
    weekChips,
    weeks,
    hasPlan,
  };
}
