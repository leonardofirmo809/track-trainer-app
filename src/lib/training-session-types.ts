export type Zone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

export type SessionType =
  | "RE" | "BA" | "IAE" | "LON"
  | "PRO" | "PRL" | "TRU" | "IAM" | "CRL"
  | "IAI" | "IAL" | "IMI" | "SUB"
  | "CUSTOM";

export type IntensityLevel = "low" | "moderate" | "high";

export type DayOfWeek = "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB" | "DOM";

export const DAYS_OF_WEEK: DayOfWeek[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
export const DAY_LABELS: Record<DayOfWeek, string> = {
  SEG: "Seg", TER: "Ter", QUA: "Qua", QUI: "Qui", SEX: "Sex", SAB: "Sáb", DOM: "Dom",
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  RE: "Regenerativo",
  BA: "Base Aeróbia",
  IAE: "Intervalado Aeróbio",
  LON: "Longão",
  PRO: "Progressivo",
  PRL: "Progressivo Longo",
  TRU: "Tempo Run",
  IAM: "Intervalado Moderado",
  CRL: "Corrida Rápida Longa",
  IAI: "Intervalado Intenso Curto",
  IAL: "Intervalado Intenso Longo",
  IMI: "Intervalado Misto",
  SUB: "Subidas",
  CUSTOM: "Personalizado",
};

export type StructureBlock = {
  id: string;
  phase: "warmup" | "main" | "recovery";
  label: string;
  content: string;
  zone: Zone;
  durationSeconds?: number;
  distanceMeters?: number;
};

export interface TrainingSession {
  id: string;
  code: string;
  name: string;
  type: SessionType;
  intensity: IntensityLevel;
  duration: number | null;
  distance: number | null;
  zones: { Z1: number; Z2: number; Z3: number; Z4: number; Z5: number };
  ratioL: number;
  ratioMH: number;
  description: string;
  structure: StructureBlock[];
  isCustom: boolean;
  tags: string[];
}

export interface WeekSummary {
  totalVolumeKm: number;
  totalDurationSeconds: number;
  ratioL: number;
  ratioMH: number;
  zoneDistribution: Record<Zone, number>;
}

export interface WeekPlan {
  weekNumber: number;
  days: Record<DayOfWeek, TrainingSession | null>;
  summary: WeekSummary;
}

export const INTENSITY_CONFIG: Record<IntensityLevel, {
  label: string;
  badgeClass: string;
  cardClass: string;
  dot: string;
}> = {
  low: {
    label: "LOW",
    badgeClass: "bg-intensity-low-bg text-intensity-low-fg border-intensity-low-border",
    cardClass: "border-l-4 border-l-intensity-low-border",
    dot: "bg-intensity-low-border",
  },
  moderate: {
    label: "MOD",
    badgeClass: "bg-intensity-mod-bg text-intensity-mod-fg border-intensity-mod-border",
    cardClass: "border-l-4 border-l-intensity-mod-border",
    dot: "bg-intensity-mod-border",
  },
  high: {
    label: "HIGH",
    badgeClass: "bg-intensity-high-bg text-intensity-high-fg border-intensity-high-border",
    cardClass: "border-l-4 border-l-intensity-high-border",
    dot: "bg-intensity-high-border",
  },
};

export function emptyDays(): Record<DayOfWeek, TrainingSession | null> {
  return { SEG: null, TER: null, QUA: null, QUI: null, SEX: null, SAB: null, DOM: null };
}

export function emptySummary(): WeekSummary {
  return {
    totalVolumeKm: 0,
    totalDurationSeconds: 0,
    ratioL: 0,
    ratioMH: 0,
    zoneDistribution: { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 },
  };
}

export function recalcSummary(days: Record<DayOfWeek, TrainingSession | null>): WeekSummary {
  const sessions = Object.values(days).filter(Boolean) as TrainingSession[];
  const totalDur = sessions.reduce((a, s) => a + (s.duration ?? 0), 0);
  const totalVol = sessions.reduce((a, s) => a + (s.distance ?? 0), 0) / 1000;
  return {
    totalVolumeKm: totalVol,
    totalDurationSeconds: totalDur,
    ratioL: totalDur > 0 ? sessions.reduce((a, s) => a + (s.duration ?? 0) * s.ratioL, 0) / totalDur : 0,
    ratioMH: totalDur > 0 ? sessions.reduce((a, s) => a + (s.duration ?? 0) * s.ratioMH, 0) / totalDur : 0,
    zoneDistribution: sessions.reduce(
      (a, s) => ({
        Z1: a.Z1 + s.zones.Z1, Z2: a.Z2 + s.zones.Z2, Z3: a.Z3 + s.zones.Z3,
        Z4: a.Z4 + s.zones.Z4, Z5: a.Z5 + s.zones.Z5,
      }),
      { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 } as Record<Zone, number>,
    ),
  };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}min`;
  if (s === 0) return `${m}min`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function parseHHMMSS(value: string): number {
  const parts = value.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function formatDistance(meters: number | null | undefined): string {
  if (!meters) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)}km`;
  return `${meters}m`;
}

/** Parse blocks for auto-zone calc — sums durationSeconds per zone. */
export function autoCalcZonesFromBlocks(blocks: StructureBlock[]): Record<Zone, number> {
  const out: Record<Zone, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  for (const b of blocks) {
    if (b.durationSeconds && b.durationSeconds > 0) out[b.zone] += b.durationSeconds;
  }
  return out;
}
