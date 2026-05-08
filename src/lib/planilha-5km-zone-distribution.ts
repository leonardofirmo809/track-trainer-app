// Cálculo de distribuição de tempo por zona em uma semana de treinos.
import type { ZoneId, Item, Section } from "./planilha-5km-data";
import { getStats } from "./planilha-5km-volumes";

export type StatsLookup = (level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string) => { durationMin: number; volumeM: number } | null;
const defaultLookup: StatsLookup = getStats;

type Workout = { code: string; sections: Section[] };

export type ZoneMinutes = Record<ZoneId, number>;

const empty = (): ZoneMinutes => ({ Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 });

function itemMinutesToZones(it: Item, acc: ZoneMinutes, distMinutesPerMeter: number) {
  if (it.kind === "single") {
    if (it.unit === "min") acc[it.zone] += it.value;
    else if (it.unit === "sec") acc[it.zone] += it.value / 60;
    else if (it.unit === "m") acc[it.zone] += it.value * distMinutesPerMeter;
  } else if (it.kind === "intervals") {
    const onMin = it.on.unit === "min" ? it.on.value : it.on.unit === "sec" ? it.on.value / 60 : 0;
    const offMin = it.off.unit === "min" ? it.off.value : it.off.unit === "sec" ? it.off.value / 60 : 0;
    acc[it.on.zone] += it.reps * onMin;
    acc[it.off.zone] += it.reps * offMin;
  } else {
    // test: vai para Z3 (esforço de prova/teste)
    acc.Z3 += it.meters * distMinutesPerMeter;
  }
}

export function workoutZoneMinutes(wo: Workout, totalMinFallback: number): ZoneMinutes {
  // 1) Calcula totais "tempo" e "metros" do treino para escala dos itens em metros.
  let timeMin = 0;
  let meters = 0;
  for (const sct of wo.sections) {
    for (const it of sct.items) {
      if (it.kind === "single") {
        if (it.unit === "min") timeMin += it.value;
        else if (it.unit === "sec") timeMin += it.value / 60;
        else if (it.unit === "m") meters += it.value;
      } else if (it.kind === "intervals") {
        const onMin = it.on.unit === "min" ? it.on.value : it.on.unit === "sec" ? it.on.value / 60 : 0;
        const offMin = it.off.unit === "min" ? it.off.value : it.off.unit === "sec" ? it.off.value / 60 : 0;
        timeMin += it.reps * (onMin + offMin);
      } else {
        meters += it.meters;
      }
    }
  }

  // Se há itens em metros, distribui os minutos restantes (totalMinFallback - timeMin) proporcional aos metros.
  const remaining = Math.max(0, totalMinFallback - timeMin);
  const distMinutesPerMeter = meters > 0 ? remaining / meters : 0;

  const acc = empty();
  for (const sct of wo.sections) {
    for (const it of sct.items) itemMinutesToZones(it, acc, distMinutesPerMeter);
  }
  return acc;
}

export function computeWeekZoneMinutes(
  workouts: Workout[],
  level: 1 | 2,
  phase: 1 | 2 | 3 | 4,
  weekIdx: number,
  lookup: StatsLookup = defaultLookup,
): ZoneMinutes {
  const total = empty();
  for (const wo of workouts) {
    const stat = lookup(level, phase, weekIdx, wo.code);
    const zm = workoutZoneMinutes(wo, stat?.durationMin ?? 0);
    (Object.keys(total) as ZoneId[]).forEach((z) => { total[z] += zm[z]; });
  }
  return total;
}

export type WeekTotals = {
  totalMin: number;
  totalM: number;
  zoneMinutes: ZoneMinutes;
  zonePercent: Record<ZoneId, number>;
  lightPct: number;
  hardPct: number;
};

export function computeWeekTotals(
  workouts: Workout[],
  level: 1 | 2,
  phase: 1 | 2 | 3 | 4,
  weekIdx: number,
  lookup: StatsLookup = defaultLookup,
): WeekTotals {
  let totalMin = 0;
  let totalM = 0;
  for (const wo of workouts) {
    const stat = lookup(level, phase, weekIdx, wo.code);
    if (stat) { totalMin += stat.durationMin; totalM += stat.volumeM; }
  }
  const zoneMinutes = computeWeekZoneMinutes(workouts, level, phase, weekIdx, lookup);
  const sum = (Object.values(zoneMinutes) as number[]).reduce((a, b) => a + b, 0);
  const zonePercent = (Object.fromEntries(
    (Object.entries(zoneMinutes) as [ZoneId, number][]).map(([k, v]) => [k, sum > 0 ? (v / sum) * 100 : 0]),
  ) as Record<ZoneId, number>);
  const lightPct = zonePercent.Z1 + zonePercent.Z2;
  const hardPct = zonePercent.Z3 + zonePercent.Z4 + zonePercent.Z5;
  return { totalMin, totalM, zoneMinutes, zonePercent, lightPct, hardPct };
}

export type WorkoutTotals = {
  code: string;
  totalMin: number;
  totalM: number;
  zoneMinutes: ZoneMinutes;
  lightPct: number;
  hardPct: number;
};

export function computeWorkoutTotals(
  wo: Workout,
  level: 1 | 2,
  phase: 1 | 2 | 3 | 4,
  weekIdx: number,
  lookup: StatsLookup = defaultLookup,
): WorkoutTotals {
  const stat = lookup(level, phase, weekIdx, wo.code);
  const totalMin = stat?.durationMin ?? 0;
  const totalM = stat?.volumeM ?? 0;
  const zm = workoutZoneMinutes(wo, totalMin);
  const sum = (Object.values(zm) as number[]).reduce((a, b) => a + b, 0);
  const pct = (Object.fromEntries(
    (Object.entries(zm) as [ZoneId, number][]).map(([k, v]) => [k, sum > 0 ? (v / sum) * 100 : 0]),
  ) as Record<ZoneId, number>);
  return {
    code: wo.code,
    totalMin,
    totalM,
    zoneMinutes: zm,
    lightPct: pct.Z1 + pct.Z2,
    hardPct: pct.Z3 + pct.Z4 + pct.Z5,
  };
}
