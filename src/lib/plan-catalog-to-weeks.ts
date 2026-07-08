// Converte o payload "de catálogo" salvo pelo fluxo principal das planilhas
// ({ level, weekDays, currentPhase, workoutOverrides? }) em WeekPlan[] — o mesmo
// formato que o PrescricaoEditor/corredor consomem via plan-to-weeks.ts.
//
// Reaproveita exatamente a mesma lógica de montagem usada em planilha-{5,10,21,42}km.tsx
// (applyOverrides + getManualDayMap + distributeWeek), só que fora de um componente React.

import {
  DAYS_OF_WEEK, emptyDays, recalcSummary,
  type DayOfWeek, type StructureBlock, type TrainingSession, type WeekPlan, type Zone,
} from "./training-session-types";
import { newSessionId } from "./training-store";
import { applyOverrides, getManualDayMap, getOverridesFromPayload } from "./workout-overrides";
import { distributeWeek, type TypesMap } from "./planilha-5km-distribute";
import { WORKOUTS, WORKOUT_TYPES, type Item, type Section, type SectionName, type Workout } from "./planilha-5km-data";
import { WORKOUTS_10KM, WORKOUT_TYPES_10KM } from "./planilha-10km-data";
import { WORKOUTS_21KM, WORKOUT_TYPES_21KM } from "./planilha-21km-data";
import { WORKOUTS_42KM, WORKOUT_TYPES_42KM } from "./planilha-42km-data";

type CatalogWorkout = { code: string; type: string; zones: string[]; sections: Section[]; note?: string };
// Catálogo normalizado por [level][phase] -> 4 semanas de treinos. Cada distância tem seu
// próprio tipo de Workout (defaultDay vs slot) e seu próprio range de fases (4 ou 5) — aqui
// tratamos todos de forma genérica, igual ao `as never` já usado em planilha-{10,21,42}km.tsx.
type NormalizedCatalog = Record<1 | 2, Record<number, Workout[][]>>;

const DAY_SET = new Set<string>(DAYS_OF_WEEK);

function isValidWeekDays(v: unknown): v is DayOfWeek[] {
  return Array.isArray(v) && v.length > 0 && v.every((d) => typeof d === "string" && DAY_SET.has(d));
}

function catalogFor(planType: string): { catalog: NormalizedCatalog; typesMap: TypesMap } | null {
  switch (planType) {
    case "5km":
      return { catalog: WORKOUTS as unknown as NormalizedCatalog, typesMap: WORKOUT_TYPES as unknown as TypesMap };
    case "10km":
      return { catalog: WORKOUTS_10KM as unknown as NormalizedCatalog, typesMap: WORKOUT_TYPES_10KM as unknown as TypesMap };
    case "21km":
      return { catalog: WORKOUTS_21KM as unknown as NormalizedCatalog, typesMap: WORKOUT_TYPES_21KM as unknown as TypesMap };
    case "42km":
      return { catalog: WORKOUTS_42KM as unknown as NormalizedCatalog, typesMap: WORKOUT_TYPES_42KM as unknown as TypesMap };
    default:
      return null;
  }
}

const SECTION_LABEL: Record<SectionName, string> = {
  warmup: "Aquecimento", main: "Treino Principal", recovery: "Recuperação", complement: "Complemento",
};

function unitLabel(u: "min" | "sec" | "m"): string {
  return u === "min" ? "min" : u === "sec" ? "seg" : "m";
}

/** Soma a contribuição de um item em segundos/metros e por zona. Itens em "m" não têm pace
 * disponível nesta camada (o pace vem do teste do aluno), então só entram na distância. */
function accumulateItem(item: Item, zones: Record<Zone, number>, totals: { seconds: number; meters: number }) {
  if (item.kind === "single") {
    if (item.unit === "min") { const sec = item.value * 60; zones[item.zone] += sec; totals.seconds += sec; }
    else if (item.unit === "sec") { zones[item.zone] += item.value; totals.seconds += item.value; }
    else { totals.meters += item.value; }
  } else if (item.kind === "intervals") {
    const onSec = item.on.unit === "min" ? item.on.value * 60 : item.on.unit === "sec" ? item.on.value : 0;
    const offSec = item.off.unit === "min" ? item.off.value * 60 : item.off.unit === "sec" ? item.off.value : 0;
    zones[item.on.zone] += item.reps * onSec;
    zones[item.off.zone] += item.reps * offSec;
    totals.seconds += item.reps * (onSec + offSec);
    if (item.on.unit === "m") totals.meters += item.reps * item.on.value;
    if (item.off.unit === "m") totals.meters += item.reps * item.off.value;
  } else {
    totals.meters += item.meters;
  }
}

function itemToStructureBlock(item: Item, sectionName: SectionName): StructureBlock {
  const phase = sectionName === "complement" ? "main" : sectionName;
  const label = SECTION_LABEL[sectionName];
  if (item.kind === "single") {
    return {
      id: newSessionId(), phase, label, zone: item.zone,
      content: `${item.value}${unitLabel(item.unit)} ${item.zone}`,
      ...(item.unit === "m" ? { distanceMeters: item.value } : { durationSeconds: item.unit === "min" ? item.value * 60 : item.value }),
    };
  }
  if (item.kind === "intervals") {
    const onSec = item.on.unit === "min" ? item.on.value * 60 : item.on.unit === "sec" ? item.on.value : undefined;
    const offSec = item.off.unit === "min" ? item.off.value * 60 : item.off.unit === "sec" ? item.off.value : undefined;
    return {
      id: newSessionId(), phase, label, zone: item.on.zone,
      content: `${item.reps}x (${item.on.value}${unitLabel(item.on.unit)} ${item.on.zone} + ${item.off.value}${unitLabel(item.off.unit)} ${item.off.zone})`,
      ...(onSec !== undefined && offSec !== undefined ? { durationSeconds: item.reps * (onSec + offSec) } : {}),
    };
  }
  return {
    id: newSessionId(), phase, label, zone: "Z3",
    content: `${item.meters}m — ${item.label}`,
    distanceMeters: item.meters,
  };
}

function workoutToTrainingSession(wo: CatalogWorkout, typesMap: TypesMap): TrainingSession {
  const zones: Record<Zone, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  const totals = { seconds: 0, meters: 0 };
  const structure: StructureBlock[] = [];
  for (const section of wo.sections) {
    for (const item of section.items) {
      accumulateItem(item, zones, totals);
      structure.push(itemToStructureBlock(item, section.name));
    }
  }
  const zoneTotal = zones.Z1 + zones.Z2 + zones.Z3 + zones.Z4 + zones.Z5;
  const light = zones.Z1 + zones.Z2;
  const ratioL = zoneTotal > 0 ? light / zoneTotal : 1;
  const ratioMH = zoneTotal > 0 ? (zoneTotal - light) / zoneTotal : 0;
  const intense = typesMap[wo.type]?.intense ?? false;

  return {
    id: newSessionId(),
    code: wo.code,
    name: wo.type,
    type: "CUSTOM",
    intensity: intense ? "high" : "low",
    duration: totals.seconds > 0 ? totals.seconds : null,
    distance: totals.meters > 0 ? totals.meters : null,
    zones,
    ratioL,
    ratioMH,
    description: wo.note ?? "",
    structure,
    isCustom: false,
    tags: [],
  };
}

/**
 * Gera WeekPlan[] a partir do payload de catálogo (level/weekDays/currentPhase[/workoutOverrides])
 * salvo por savePlanilha{5,10,21,42}kmConfig. Retorna `null` se o payload não tiver o formato
 * esperado ou `planType` não corresponder a uma distância conhecida — o chamador deve então
 * cair no fallback de semanas vazias.
 */
export function catalogPayloadToWeeks(payload: Record<string, unknown>, planType: string): WeekPlan[] | null {
  const level = payload.level;
  const currentPhase = payload.currentPhase;
  const weekDays = payload.weekDays;

  if (level !== 1 && level !== 2) return null;
  if (typeof currentPhase !== "number" || !Number.isInteger(currentPhase) || currentPhase < 1) return null;
  if (!isValidWeekDays(weekDays)) return null;

  const found = catalogFor(planType);
  if (!found) return null;
  const { catalog, typesMap } = found;

  const phaseWeeks = catalog[level]?.[currentPhase];
  if (!phaseWeeks || !Array.isArray(phaseWeeks)) return null;

  const overrides = getOverridesFromPayload(payload);
  const phaseOv = overrides[String(currentPhase)] ?? {};

  return phaseWeeks.map((wos, weekIdx) => {
    const weekOv = phaseOv[String(weekIdx)];
    const list = applyOverrides(wos, weekOv);
    const manualDayByCode = getManualDayMap(weekOv, list);
    const dist = distributeWeek(list, weekDays, level, typesMap, { manualDayByCode, noDrop: true });

    const days = emptyDays();
    for (const a of dist.assignments) {
      days[a.day] = a.workout ? workoutToTrainingSession(a.workout, typesMap) : null;
    }
    return { weekNumber: weekIdx + 1, days, summary: recalcSummary(days) };
  });
}
