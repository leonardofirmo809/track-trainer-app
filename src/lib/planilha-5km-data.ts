// Banco de treinos da Planilha 5km — Níveis 1 e 2, 4 fases × 4 semanas.

export type DayCode = "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB" | "DOM";
export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

export const DAY_ORDER: DayCode[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
export const DAY_LABEL: Record<DayCode, string> = {
  SEG: "SEG", TER: "TER", QUA: "QUA", QUI: "QUI", SEX: "SEX", SAB: "SÁB", DOM: "DOM",
};
export const DAY_FULL: Record<DayCode, string> = {
  SEG: "SEGUNDA", TER: "TERÇA", QUA: "QUARTA", QUI: "QUINTA", SEX: "SEXTA", SAB: "SÁBADO", DOM: "DOMINGO",
};

export type WorkoutType =
  | "Base aeróbia" | "Progressivo" | "Corrida Rápida" | "Subidas"
  | "Regenerativo" | "Tempo Run" | "Intervalado Longo" | "Intervalado Curto"
  | "Longão" | "Teste 3km" | "Simulado 5km";

export const WORKOUT_TYPES: Record<WorkoutType, { color: string; intense: boolean }> = {
  "Base aeróbia":      { color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700", intense: false },
  "Progressivo":       { color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700", intense: false },
  "Corrida Rápida":    { color: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-700", intense: true },
  "Subidas":           { color: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700", intense: true },
  "Regenerativo":      { color: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-200 dark:border-zinc-600", intense: false },
  "Tempo Run":         { color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-700", intense: false },
  "Intervalado Longo": { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Intervalado Curto": { color: "bg-orange-200 text-orange-950 border-orange-400 dark:bg-orange-900/60 dark:text-orange-100 dark:border-orange-600", intense: true },
  "Longão":            { color: "bg-emerald-200 text-emerald-950 border-emerald-500 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-600", intense: false },
  "Teste 3km":         { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
  "Simulado 5km":      { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
};

export const PHASE_LABELS: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
  1: { title: "Fase 1", subtitle: "Preparação Geral" },
  2: { title: "Fase 2", subtitle: "Preparação Geral (continuação)" },
  3: { title: "Fase 3", subtitle: "Preparação Específica" },
  4: { title: "Fase 4", subtitle: "Polimento" },
};

export type Unit = "min" | "sec" | "m";
export type Single = { kind: "single"; value: number; unit: Unit; zone: ZoneId };
export type Intervals = { kind: "intervals"; reps: number; on: Single; off: Single };
export type Test = { kind: "test"; meters: number; label: string; note?: string };
export type Item = Single | Intervals | Test;
export type SectionName = "warmup" | "main" | "recovery" | "complement";
export type Section = { name: SectionName; items: Item[] };

export type Workout = {
  code: string;
  defaultDay: DayCode;
  type: WorkoutType;
  zones: ZoneId[];
  sections: Section[];
  note?: string;
};
export type PhaseWeeks = [Workout[], Workout[], Workout[], Workout[]]; // 4 semanas
export type PhasesByLevel = Record<1 | 2 | 3 | 4, PhaseWeeks>;

// ---------- Builders ----------
const s = (value: number, unit: Unit, zone: ZoneId): Single => ({ kind: "single", value, unit, zone });
const iv = (reps: number, on: Single, off: Single): Intervals => ({ kind: "intervals", reps, on, off });
const t = (meters: number, label: string, note?: string): Test => ({ kind: "test", meters, label, note });
const sec = (name: SectionName, ...items: Item[]): Section => ({ name, items });

const w = (
  code: string, defaultDay: DayCode, type: WorkoutType, zones: ZoneId[],
  sections: Section[], note?: string,
): Workout => ({ code, defaultDay, type, zones, sections, note });

// ============= NÍVEL 1 (3x/semana: TER, QUI, SAB) =============
export const LEVEL_1: PhasesByLevel = {
  1: [
    // F1 S1
    [
      w("T01", "TER", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(15, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F1 S2
    [
      w("T04", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(15, "min", "Z2"), s(5, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T05", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(5, s(1, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F1 S3
    [
      w("T07", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(5, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T08", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T09", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F1 S4
    [
      w("T10", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(8, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T12", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
  ],
  2: [
    // F2 S1
    [
      w("T01", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(5, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S2
    [
      w("T04", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T05", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(1, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S3
    [
      w("T07", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(15, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T08", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T09", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S4 — Teste 3km
    [
      w("T10", "TER", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "QUI", "Teste 3km", ["Z1", "Z2", "Z3"], [sec("warmup", s(500, "m", "Z1"), s(500, "m", "Z2")), sec("main", t(3000, "TESTE 3KM", "Percurso plano — anotar tempo!"))], "Terminou o Z2, água, recupera e VAI!"),
      w("T12", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(40, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
  ],
  3: [
    // F3 S1
    [
      w("T01", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(15, "min", "Z2"), s(12, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F3 S2
    [
      w("T04", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(15, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T05", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F3 S3
    [
      w("T07", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(12, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T08", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(1, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T09", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F3 S4
    [
      w("T10", "TER", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T12", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
  ],
  4: [
    // F4 S1
    [
      w("T01", "TER", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(8, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F4 S2
    [
      w("T04", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T05", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F4 S3
    [
      w("T07", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(15, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T08", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T09", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F4 S4 — Simulado
    [
      w("T10", "TER", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "QUI", "Regenerativo", ["Z1"], [sec("main", s(20, "min", "Z1"))]),
      w("T12", "SAB", "Simulado 5km", ["Z1", "Z3", "Z4"], [sec("warmup", s(1000, "m", "Z1")), sec("main", s(4500, "m", "Z3"), s(500, "m", "Z4"))], "Simulado de prova!"),
    ],
  ],
};

// ============= NÍVEL 2 (4x/semana: TER, QUI, SEX, SAB) =============
export const LEVEL_2: PhasesByLevel = {
  1: [
    // F1 S1
    [
      w("T01", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(20, "min", "Z2"), s(8, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(5, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SEX", "Regenerativo", ["Z1"], [sec("main", s(30, "min", "Z1"))]),
      w("T04", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F1 S2
    [
      w("T05", "TER", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(5, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(10, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T07", "SEX", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))]),
      w("T08", "SAB", "Longão", ["Z1", "Z2"], [sec("warmup", s(2000, "m", "Z1")), sec("main", s(6000, "m", "Z2")), sec("recovery", s(1000, "m", "Z1"))]),
    ],
    // F1 S3
    [
      w("T09", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(15, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T10", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(1, "min", "Z5"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "SEX", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))]),
      w("T12", "SAB", "Longão", ["Z1", "Z2"], [sec("warmup", s(2000, "m", "Z1")), sec("main", s(7000, "m", "Z2")), sec("recovery", s(1000, "m", "Z1"))]),
    ],
    // F1 S4
    [
      w("T13", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T14", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T15", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T16", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(30, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
  ],
  2: [
    // F2 S1
    [
      w("T01", "TER", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T02", "QUI", "Intervalado Curto", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(1, "min", "Z5"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SEX", "Regenerativo", ["Z1"], [sec("main", s(30, "min", "Z1"))]),
      w("T04", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(40, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S2
    [
      w("T05", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(25, "min", "Z2"), s(10, "min", "Z3"))]),
      w("T06", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(5, "min", "Z4"), s(3, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T07", "SEX", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))]),
      w("T08", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(50, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S3
    [
      w("T09", "TER", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T10", "QUI", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(18, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T11", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T12", "SAB", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(60, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F2 S4 — Teste
    [
      w("T13", "TER", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T14", "QUI", "Teste 3km", ["Z1", "Z2", "Z3"], [sec("warmup", s(1000, "m", "Z1"), s(500, "m", "Z2")), sec("main", t(3000, "TESTE 3KM (Z3)", "Percurso PLANO! Anotar tempo!"))]),
      w("T15", "SEX", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))]),
      w("T16", "SAB", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(5, "min", "Z4"), s(3, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
    ],
  ],
  3: [
    // F3 S1
    [
      w("T01", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(18, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T02", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(4, s(3, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T04", "SAB", "Longão", ["Z1", "Z2"], [sec("warmup", s(2000, "m", "Z1")), sec("main", s(8000, "m", "Z2")), sec("recovery", s(1000, "m", "Z1"))]),
    ],
    // F3 S2
    [
      w("T05", "TER", "Tempo Run", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", s(20, "min", "Z3")), sec("recovery", s(5, "min", "Z2"), s(5, "min", "Z1"))]),
      w("T06", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(5, "min", "Z4"), s(3, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T07", "SEX", "Regenerativo", ["Z1"], [sec("main", s(50, "min", "Z1"))]),
      w("T08", "SAB", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F3 S3
    [
      w("T09", "TER", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
      w("T10", "QUI", "Intervalado Curto", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(8, s(1, "min", "Z5"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "SEX", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))]),
      w("T12", "SAB", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2"), s(15, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F3 S4
    [
      w("T13", "TER", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T14", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(10, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T15", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T16", "SAB", "Longão", ["Z1", "Z2"], [sec("warmup", s(2000, "m", "Z1")), sec("main", s(9000, "m", "Z2")), sec("recovery", s(1000, "m", "Z1"))]),
    ],
  ],
  4: [
    // F4 S1
    [
      w("T01", "TER", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(3, "min", "Z4"), s(2, "min", "Z1")))]),
      w("T02", "QUI", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T03", "SEX", "Regenerativo", ["Z1"], [sec("main", s(30, "min", "Z1"))], "Reduzido — semana de polimento"),
      w("T04", "SAB", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(3, "min", "Z4"), s(2, "min", "Z1")))]),
    ],
    // F4 S2
    [
      w("T05", "TER", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
      w("T06", "QUI", "Intervalado Longo", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(3, s(5, "min", "Z4"), s(3, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T07", "SEX", "Regenerativo", ["Z1"], [sec("main", s(50, "min", "Z1"))]),
      w("T08", "SAB", "Progressivo", ["Z1", "Z2", "Z3"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2"), s(10, "min", "Z3")), sec("recovery", s(5, "min", "Z1"))]),
    ],
    // F4 S3
    [
      w("T09", "TER", "Base aeróbia", ["Z1", "Z2"], [sec("warmup", s(5, "min", "Z1")), sec("main", s(35, "min", "Z2")), sec("recovery", s(5, "min", "Z1"))]),
      w("T10", "QUI", "Subidas", ["Z1", "Z2", "Z5"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(10, s(30, "sec", "Z5"), s(90, "sec", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T11", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T12", "SAB", "Longão", ["Z1", "Z2"], [sec("warmup", s(2000, "m", "Z1")), sec("main", s(9000, "m", "Z2")), sec("recovery", s(1000, "m", "Z1"))]),
    ],
    // F4 S4 — Simulado
    [
      w("T13", "TER", "Corrida Rápida", ["Z1", "Z2", "Z4"], [sec("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")), sec("main", iv(6, s(2, "min", "Z4"), s(2, "min", "Z1"))), sec("recovery", s(5, "min", "Z1"))]),
      w("T14", "QUI", "Regenerativo", ["Z1"], [sec("main", s(35, "min", "Z1"))], "Redução pré-prova"),
      w("T15", "SEX", "Regenerativo", ["Z1"], [sec("main", s(40, "min", "Z1"))]),
      w("T16", "SAB", "Simulado 5km", ["Z1", "Z3", "Z4"], [sec("warmup", s(1000, "m", "Z1")), sec("main", s(4500, "m", "Z3"), s(500, "m", "Z4"))], "Simulado de prova 5km!"),
    ],
  ],
};

export const WORKOUTS: Record<1 | 2, PhasesByLevel> = { 1: LEVEL_1, 2: LEVEL_2 };

// ---------- Helpers ----------
export function workoutDurationMinutes(wo: Workout): number {
  let total = 0;
  for (const sct of wo.sections) for (const it of sct.items) {
    if (it.kind === "single") {
      if (it.unit === "min") total += it.value;
      else if (it.unit === "sec") total += it.value / 60;
      else total += it.value / 200; // estimativa: 1km ≈ 5min
    } else if (it.kind === "intervals") {
      const onMin = it.on.unit === "min" ? it.on.value : it.on.unit === "sec" ? it.on.value / 60 : it.on.value / 200;
      const offMin = it.off.unit === "min" ? it.off.value : it.off.unit === "sec" ? it.off.value / 60 : it.off.value / 200;
      total += it.reps * (onMin + offMin);
    } else {
      total += it.meters / 200;
    }
  }
  return total;
}

export function workoutZonesIntense(wo: Workout): boolean {
  return WORKOUT_TYPES[wo.type].intense;
}

export function defaultDaysFor(level: 1 | 2): DayCode[] {
  return level === 1 ? ["TER", "QUI", "SAB"] : ["TER", "QUI", "SEX", "SAB"];
}
