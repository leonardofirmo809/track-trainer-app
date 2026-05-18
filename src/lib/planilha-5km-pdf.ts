import { renderPlanilhaPdf, type SavedZone } from "@/lib/planilha-pdf-theme";
import {
  DAY_LABEL, DAY_FULL, PHASE_LABELS, WORKOUT_TYPES,
  type DayCode, type Workout,
} from "@/lib/planilha-5km-data";
import type { CoachBranding } from "@/lib/use-coach-branding";
import type { DistributionResult } from "@/lib/planilha-5km-distribute";

export type { SavedZone };
export { downloadBlob } from "@/lib/planilha-pdf-theme";

export async function generatePlanilha5kmPdf(opts: {
  studentName: string;
  studentLevel: string | null;
  ftpSecondsPerKm: number;
  zones: SavedZone[];
  level: 1 | 2;
  daysPerWeek: number;
  weekDays: DayCode[];
  currentPhase: 1 | 2 | 3 | 4;
  weeks: DistributionResult<Workout>[];
  branding: CoachBranding;
  generatedAt?: string | Date | null;
}): Promise<Blob> {
  return renderPlanilhaPdf({
    distanceLabel: "5KM",
    phaseTitle: PHASE_LABELS[opts.currentPhase].title,
    phaseSubtitle: PHASE_LABELS[opts.currentPhase].subtitle,
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
    isIntense: (type) => WORKOUT_TYPES[type as keyof typeof WORKOUT_TYPES]?.intense ?? false,
  });
}
