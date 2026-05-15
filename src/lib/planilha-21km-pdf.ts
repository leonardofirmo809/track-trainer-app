import { renderPlanilhaPdf, type SavedZone } from "@/lib/planilha-pdf-theme";
import {
  DAY_LABEL, DAY_FULL, PHASE_LABELS_21KM, WORKOUT_TYPES_21KM,
  type DayCode, type Workout21km as Workout, type Phase21,
} from "@/lib/planilha-21km-data";
import type { CoachBranding } from "@/lib/use-coach-branding";
import type { DistributionResult } from "@/lib/planilha-5km-distribute";

export type { SavedZone };
export { downloadBlob } from "@/lib/planilha-pdf-theme";

export async function generatePlanilha21kmPdf(opts: {
  studentName: string;
  studentLevel: string | null;
  ftpSecondsPerKm: number;
  zones: SavedZone[];
  level: 1 | 2;
  daysPerWeek: number;
  weekDays: DayCode[];
  currentPhase: Phase21;
  weeks: DistributionResult<Workout>[];
  branding: CoachBranding;
}): Promise<Blob> {
  return renderPlanilhaPdf({
    distanceLabel: "21KM",
    phaseTitle: PHASE_LABELS_21KM[opts.currentPhase].title,
    phaseSubtitle: PHASE_LABELS_21KM[opts.currentPhase].subtitle,
    studentName: opts.studentName,
    studentLevel: opts.studentLevel,
    ftpSecondsPerKm: opts.ftpSecondsPerKm,
    zones: opts.zones,
    level: opts.level,
    daysPerWeek: opts.daysPerWeek,
    weekDays: opts.weekDays.map((d) => ({ short: DAY_LABEL[d], full: DAY_FULL[d] })),
    weeks: opts.weeks,
    branding: opts.branding,
    dayFull: DAY_FULL,
    isIntense: (type) => WORKOUT_TYPES_21KM[type as keyof typeof WORKOUT_TYPES_21KM]?.intense ?? false,
  });
}
