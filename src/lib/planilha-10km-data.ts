// Banco de treinos da Planilha 10km — Níveis 1 e 2, 4 fases × 4 semanas.
// Reaproveita tipos base (DayCode, ZoneId, Item, Section, builders) da 5km.

import {
  DAY_ORDER, DAY_LABEL, DAY_FULL,
  type DayCode, type ZoneId, type Item, type Single, type Intervals, type Test,
  type SectionName, type Section, type Unit,
} from "./planilha-5km-data";

export { DAY_ORDER, DAY_LABEL, DAY_FULL };
export type { DayCode, ZoneId, Item, SectionName };

export type WorkoutType10km =
  | "Base aeróbia" | "Progressivo" | "Corrida Rápida" | "Subidas"
  | "Regenerativo" | "Tempo Run" | "Intervalado Longo" | "Intervalado Curto"
  | "Intervalado Moderado" | "Corrida Rápida Longa"
  | "Longão" | "Teste 3km" | "Simulado 10km";

export const WORKOUT_TYPES_10KM: Record<WorkoutType10km, { color: string; intense: boolean }> = {
  "Base aeróbia":          { color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700", intense: false },
  "Progressivo":           { color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700", intense: false },
  "Corrida Rápida":        { color: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-700", intense: true },
  "Corrida Rápida Longa":  { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Subidas":               { color: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700", intense: true },
  "Regenerativo":          { color: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-200 dark:border-zinc-600", intense: false },
  "Tempo Run":             { color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-700", intense: false },
  "Intervalado Longo":     { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Intervalado Moderado":  { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Intervalado Curto":     { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Longão":                { color: "bg-emerald-200 text-emerald-950 border-emerald-500 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-600", intense: false },
  "Teste 3km":             { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
  "Simulado 10km":         { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
};

export const PHASE_LABELS_10KM: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
  1: { title: "Fase 1", subtitle: "Preparação Geral" },
  2: { title: "Fase 2", subtitle: "Preparação Geral (continuação)" },
  3: { title: "Fase 3", subtitle: "Preparação Específica" },
  4: { title: "Fase 4", subtitle: "Polimento" },
};

export type Workout10km = {
  code: string;
  defaultDay: DayCode;
  type: WorkoutType10km;
  zones: ZoneId[];
  sections: Section[];
  note?: string;
};
export type PhaseWeeks10km = [Workout10km[], Workout10km[], Workout10km[], Workout10km[]];
export type PhasesByLevel10km = Record<1 | 2 | 3 | 4, PhaseWeeks10km>;

// ---------- Builders ----------
const s = (value: number, unit: Unit, zone: ZoneId): Single => ({ kind: "single", value, unit, zone });
const iv = (reps: number, on: Single, off: Single): Intervals => ({ kind: "intervals", reps, on, off });
const t = (meters: number, label: string, note?: string): Test => ({ kind: "test", meters, label, note });
const sec = (name: SectionName, ...items: Item[]): Section => ({ name, items });
const w = (
  code: string, defaultDay: DayCode, type: WorkoutType10km, zones: ZoneId[],
  sections: Section[], note?: string,
): Workout10km => ({ code, defaultDay, type, zones, sections, note });

// ---------- Templates por tipo ----------
function baseAerobia(code: string, day: DayCode, durMin: number): Workout10km {
  const z2 = Math.max(5, durMin - 10);
  return w(code, day, "Base aeróbia", ["Z1", "Z2"], [
    sec("warmup", s(5, "min", "Z1")),
    sec("main", s(z2, "min", "Z2")),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function progressivo(code: string, day: DayCode, durMin: number, z3: number): Workout10km {
  const z2 = Math.max(3, durMin - 10 - z3);
  return w(code, day, "Progressivo", ["Z1", "Z2", "Z3"], [
    sec("warmup", s(5, "min", "Z1")),
    sec("main", s(z2, "min", "Z2"), s(z3, "min", "Z3")),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function corridaRapida(code: string, day: DayCode, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, day, "Corrida Rápida", ["Z1", "Z2", "Z4"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function subidas(code: string, day: DayCode, reps: number, onSec: number, offSec: number): Workout10km {
  return w(code, day, "Subidas", ["Z1", "Z2", "Z5"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", iv(reps, s(onSec, "sec", "Z5"), s(offSec, "sec", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function tempoRun(code: string, day: DayCode, z3Min: number): Workout10km {
  return w(code, day, "Tempo Run", ["Z1", "Z2", "Z3"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", s(z3Min, "min", "Z3")),
    sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1")),
  ]);
}
function intervaladoLongo(code: string, day: DayCode, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, day, "Intervalado Longo", ["Z1", "Z2", "Z4"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function intervaladoModerado(code: string, day: DayCode, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, day, "Intervalado Moderado", ["Z1", "Z2", "Z4"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function intervaladoCurto(code: string, day: DayCode, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, day, "Intervalado Curto", ["Z1", "Z2", "Z5"], [
    sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sec("main", iv(reps, s(onMin, "min", "Z5"), s(offMin, "min", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function corridaRapidaLonga(code: string, day: DayCode, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, day, "Corrida Rápida Longa", ["Z1", "Z2", "Z4"], [
    sec("warmup", s(800, "m", "Z1"), s(1600, "m", "Z2")),
    sec("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sec("recovery", s(5, "min", "Z1")),
  ]);
}
function regenerativo(code: string, day: DayCode, durMin: number, note?: string): Workout10km {
  return w(code, day, "Regenerativo", ["Z1"], [sec("main", s(durMin, "min", "Z1"))], note);
}
function longao(code: string, day: DayCode, z2Km: number): Workout10km {
  return w(code, day, "Longão", ["Z1", "Z2"], [
    sec("warmup", s(2000, "m", "Z1")),
    sec("main", s(z2Km * 1000, "m", "Z2")),
    sec("recovery", s(2000, "m", "Z1")),
  ]);
}
function teste3km(code: string, day: DayCode): Workout10km {
  return w(code, day, "Teste 3km", ["Z1", "Z2", "Z3"], [
    sec("warmup", s(500, "m", "Z1"), s(500, "m", "Z2")),
    sec("main", t(3000, "TESTE 3KM", "Percurso plano — anotar tempo!")),
  ], "Terminou o Z2, água, recupera e VAI!");
}
function simulado10km(code: string, day: DayCode): Workout10km {
  return w(code, day, "Simulado 10km", ["Z1", "Z3", "Z4"], [
    sec("warmup", s(1000, "m", "Z1")),
    sec("main", s(8000, "m", "Z3"), s(1000, "m", "Z4")),
  ], "Simulado de prova 10km!");
}

// ============= NÍVEL 1 (3x/semana: TER, QUI, SAB) =============
export const LEVEL_1_10KM: PhasesByLevel10km = {
  1: [
    [
      progressivo("T01", "TER", 40, 10),
      corridaRapida("T02", "QUI", 4, 2, 2),
      baseAerobia("T03", "SAB", 35),
    ],
    [
      progressivo("T04", "TER", 38, 8),
      corridaRapida("T05", "QUI", 4, 2, 2),
      baseAerobia("T06", "SAB", 40),
    ],
    [
      progressivo("T07", "TER", 40, 10),
      corridaRapida("T08", "QUI", 6, 2, 2),
      baseAerobia("T09", "SAB", 45),
    ],
    [
      tempoRun("T10", "TER", 15),
      subidas("T11", "QUI", 6, 30, 90),
      baseAerobia("T12", "SAB", 50),
    ],
  ],
  2: [
    [
      progressivo("T01", "TER", 45, 10),
      subidas("T02", "QUI", 8, 30, 90),
      baseAerobia("T03", "SAB", 50),
    ],
    [
      progressivo("T04", "TER", 47, 12),
      subidas("T05", "QUI", 8, 30, 90),
      baseAerobia("T06", "SAB", 55),
    ],
    [
      tempoRun("T07", "TER", 15),
      corridaRapida("T08", "QUI", 6, 2, 2),
      baseAerobia("T09", "SAB", 40),
    ],
    [
      intervaladoCurto("T10", "TER", 6, 1, 2),
      teste3km("T11", "QUI"),
      baseAerobia("T12", "SAB", 50),
    ],
  ],
  3: [
    [
      progressivo("T01", "TER", 47, 12),
      intervaladoModerado("T02", "QUI", 6, 4, 2),
      baseAerobia("T03", "SAB", 60),
    ],
    [
      tempoRun("T04", "TER", 18),
      subidas("T05", "QUI", 8, 30, 90),
      baseAerobia("T06", "SAB", 65),
    ],
    [
      progressivo("T07", "TER", 45, 12),
      intervaladoLongo("T08", "QUI", 4, 3, 2),
      baseAerobia("T09", "SAB", 50),
    ],
    [
      progressivo("T10", "TER", 55, 15),
      intervaladoLongo("T11", "QUI", 5, 3, 2),
      baseAerobia("T12", "SAB", 60),
    ],
  ],
  4: [
    [
      intervaladoLongo("T01", "TER", 4, 3, 2),
      progressivo("T02", "QUI", 52, 14),
      baseAerobia("T03", "SAB", 70),
    ],
    [
      intervaladoLongo("T04", "TER", 5, 3, 2),
      progressivo("T05", "QUI", 57, 15),
      baseAerobia("T06", "SAB", 45),
    ],
    [
      intervaladoLongo("T07", "TER", 6, 3, 2),
      progressivo("T08", "QUI", 50, 14),
      baseAerobia("T09", "SAB", 55),
    ],
    [
      corridaRapida("T10", "TER", 6, 2, 2),
      regenerativo("T11", "QUI", 30, "Redução pré-prova"),
      simulado10km("T12", "SAB"),
    ],
  ],
};

// ============= NÍVEL 2 (4x/semana: TER, QUI, SEX, SAB) =============
function longaoSeg(code: string, day: DayCode, z2Km: number): Workout10km {
  return longao(code, day, z2Km);
}

export const LEVEL_2_10KM: PhasesByLevel10km = {
  1: [
    [
      progressivo("T01", "TER", 45, 10),
      corridaRapida("T02", "QUI", 4, 2, 2),
      regenerativo("T03", "SEX", 30),
      longaoSeg("T04", "SAB", 6),
    ],
    [
      progressivo("T05", "TER", 47, 12),
      corridaRapida("T06", "QUI", 5, 2, 2),
      regenerativo("T07", "SEX", 40),
      longaoSeg("T08", "SAB", 7),
    ],
    [
      progressivo("T09", "TER", 50, 12),
      corridaRapida("T10", "QUI", 6, 2, 2),
      regenerativo("T11", "SEX", 40),
      longaoSeg("T12", "SAB", 6),
    ],
    [
      tempoRun("T13", "TER", 18),
      subidas("T14", "QUI", 8, 30, 90),
      regenerativo("T15", "SEX", 40),
      longaoSeg("T16", "SAB", 8),
    ],
  ],
  2: [
    [
      progressivo("T01", "TER", 60, 18),
      subidas("T02", "QUI", 8, 30, 90),
      regenerativo("T03", "SEX", 30),
      longaoSeg("T04", "SAB", 9),
    ],
    [
      progressivo("T05", "TER", 47, 12),
      subidas("T06", "QUI", 8, 30, 90),
      regenerativo("T07", "SEX", 35),
      longaoSeg("T08", "SAB", 7),
    ],
    [
      corridaRapida("T09", "TER", 6, 2, 2),
      baseAerobia("T10", "QUI", 50),
      regenerativo("T11", "SEX", 40),
      progressivo("T12", "SAB", 62, 18),
    ],
    [
      corridaRapida("T13", "TER", 6, 2, 2),
      teste3km("T14", "QUI"),
      regenerativo("T15", "SEX", 35),
      longaoSeg("T16", "SAB", 7),
    ],
  ],
  3: [
    [
      intervaladoLongo("T01", "TER", 5, 3, 2),
      corridaRapida("T02", "QUI", 5, 2, 2),
      regenerativo("T03", "SEX", 40),
      corridaRapidaLonga("T04", "SAB", 5, 5, 2),
    ],
    [
      intervaladoLongo("T05", "TER", 5, 3, 2),
      tempoRun("T06", "QUI", 18),
      regenerativo("T07", "SEX", 40),
      longaoSeg("T08", "SAB", 9),
    ],
    [
      intervaladoModerado("T09", "TER", 8, 4, 2),
      intervaladoLongo("T10", "QUI", 5, 3, 2),
      regenerativo("T11", "SEX", 35),
      progressivo("T12", "SAB", 55, 16),
    ],
    [
      intervaladoLongo("T13", "TER", 6, 3, 2),
      progressivo("T14", "QUI", 40, 12),
      regenerativo("T15", "SEX", 40),
      corridaRapidaLonga("T16", "SAB", 6, 5, 2),
    ],
  ],
  4: [
    [
      tempoRun("T01", "TER", 18),
      intervaladoLongo("T02", "QUI", 6, 3, 2),
      regenerativo("T03", "SEX", 40),
      baseAerobia("T04", "SAB", 65),
    ],
    [
      corridaRapida("T05", "TER", 6, 2, 2),
      longaoSeg("T06", "QUI", 6),
      regenerativo("T07", "SEX", 30),
      corridaRapidaLonga("T08", "SAB", 8, 5, 2),
    ],
    [
      intervaladoLongo("T09", "TER", 5, 3, 2),
      progressivo("T10", "QUI", 47, 14),
      regenerativo("T11", "SEX", 30),
      simulado10km("T12", "SAB"),
    ],
    [
      corridaRapida("T13", "TER", 5, 2, 2),
      regenerativo("T14", "QUI", 40),
      regenerativo("T15", "SEX", 65, "Redução pré-prova"),
      simulado10km("T16", "SAB"),
    ],
  ],
};

export const WORKOUTS_10KM: Record<1 | 2, PhasesByLevel10km> = { 1: LEVEL_1_10KM, 2: LEVEL_2_10KM };

export function defaultDaysFor10km(level: 1 | 2): DayCode[] {
  return level === 1 ? ["TER", "QUI", "SAB"] : ["TER", "QUI", "SEX", "SAB"];
}
