// Banco de treinos da Planilha 10km — atribuição por SLOT (não por dia fixo).
// O distribuidor (planilha-10km-distribute.ts) mapeia slots para os dias marcados pelo professor.
//
// NÍVEL 1: 1 plano único de 4 semanas (3 slots/semana). As 4 entradas em WORKOUTS_10KM[1]
//          são o mesmo plano (a UI esconde abas para N1).
// NÍVEL 2: 4 planos × 4 semanas × 4 slots — Geral, Específico, Avançado, Polimento.

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
  | "Longão" | "Teste 3km" | "Simulado 10km" | "Simulado 5km";

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
  "Simulado 5km":          { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
};

// Para N1 só usamos a "fase 1" — mas mantemos a chave para compat. Para N2, 4 planos.
export const PHASE_LABELS_10KM: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
  1: { title: "Plano 1", subtitle: "Preparação Geral" },
  2: { title: "Plano 2", subtitle: "Preparação Específica" },
  3: { title: "Plano 3", subtitle: "Específico Avançado" },
  4: { title: "Plano 4", subtitle: "Polimento / Prova" },
};

export type Workout10km = {
  code: string;
  slot: 1 | 2 | 3 | 4 | 5;
  type: WorkoutType10km;
  zones: ZoneId[];
  sections: Section[];
  note?: string;
};
export type WeekWorkouts10km = Workout10km[];
export type PhaseWeeks10km = [WeekWorkouts10km, WeekWorkouts10km, WeekWorkouts10km, WeekWorkouts10km];
export type PhasesByLevel10km = Record<1 | 2 | 3 | 4, PhaseWeeks10km>;

// ---------- Builders básicos ----------
const s = (value: number, unit: Unit, zone: ZoneId): Single => ({ kind: "single", value, unit, zone });
const iv = (reps: number, on: Single, off: Single): Intervals => ({ kind: "intervals", reps, on, off });
const tst = (meters: number, label: string, note?: string): Test => ({ kind: "test", meters, label, note });
const sect = (name: SectionName, ...items: Item[]): Section => ({ name, items });
const w = (
  code: string, slot: 1 | 2 | 3 | 4 | 5, type: WorkoutType10km, zones: ZoneId[],
  sections: Section[], note?: string,
): Workout10km => ({ code, slot, type, zones, sections, note });

// ---------- Templates por tipo ----------
function progressivo(code: string, slot: 1|2|3|4|5, durMin: number, z3Min: number): Workout10km {
  const z2 = Math.max(3, durMin - 10 - z3Min);
  return w(code, slot, "Progressivo", ["Z1", "Z2", "Z3"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2, "min", "Z2"), s(z3Min, "min", "Z3")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function corridaRapida(code: string, slot: 1|2|3|4|5, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, slot, "Corrida Rápida", ["Z1", "Z2", "Z4"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function subidasSec(code: string, slot: 1|2|3|4|5, reps: number, onSec: number, offSec: number): Workout10km {
  return w(code, slot, "Subidas", ["Z1", "Z2", "Z5"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onSec, "sec", "Z5"), s(offSec, "sec", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function subidasMin(code: string, slot: 1|2|3|4|5, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, slot, "Subidas", ["Z1", "Z2", "Z5"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z5"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function tempoRun(code: string, slot: 1|2|3|4|5, z3Min: number): Workout10km {
  return w(code, slot, "Tempo Run", ["Z1", "Z2", "Z3"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", s(z3Min, "min", "Z3")),
    sect("recovery", s(5, "min", "Z2"), s(5, "min", "Z1")),
  ]);
}
function intervaladoLongo(code: string, slot: 1|2|3|4|5, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, slot, "Intervalado Longo", ["Z1", "Z2", "Z4"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function intervaladoModerado(code: string, slot: 1|2|3|4|5, reps: number, onMin: number, offMin: number): Workout10km {
  return w(code, slot, "Intervalado Moderado", ["Z1", "Z2", "Z3"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z3"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z2"), s(5, "min", "Z1")),
  ]);
}
function corridaRapidaLonga(code: string, slot: 1|2|3|4|5, reps: number): Workout10km {
  return w(code, slot, "Corrida Rápida Longa", ["Z1", "Z2", "Z3"], [
    sect("warmup", s(800, "m", "Z1"), s(1600, "m", "Z2")),
    sect("main", iv(reps, s(400, "m", "Z3"), s(1200, "m", "Z2"))),
    sect("recovery", s(800, "m", "Z1")),
  ]);
}
function regenerativo(code: string, slot: 1|2|3|4|5, durMin: number, note?: string): Workout10km {
  return w(code, slot, "Regenerativo", ["Z1"], [sect("main", s(durMin, "min", "Z1"))], note);
}
function baseAerobia(code: string, slot: 1|2|3|4|5, durMin: number): Workout10km {
  const z2 = Math.max(5, durMin - 10);
  return w(code, slot, "Base aeróbia", ["Z1", "Z2"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2, "min", "Z2")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
// Longão por DISTÂNCIA (N2 padrão): 2000m Z1 + Xkm Z2 + 1000m Z1
function longaoDist(code: string, slot: 1|2|3|4|5, z2Km: number): Workout10km {
  return w(code, slot, "Longão", ["Z1", "Z2"], [
    sect("warmup", s(2000, "m", "Z1")),
    sect("main", s(z2Km * 1000, "m", "Z2")),
    sect("recovery", s(1000, "m", "Z1")),
  ]);
}
// Longão por TEMPO (N1 e polimento N2): 5min Z1 + Xmin Z2 + 5min Z1
function longaoTempo(code: string, slot: 1|2|3|4|5, z2Min: number): Workout10km {
  return w(code, slot, "Longão", ["Z1", "Z2"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2Min, "min", "Z2")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
// Teste 3km — aquecimento varia (N1: 500/500, N2: 1000/500)
function teste3km(code: string, slot: 1|2|3|4|5, level: 1 | 2): Workout10km {
  const wu = level === 1
    ? [s(500, "m", "Z1"), s(500, "m", "Z2")]
    : [s(1000, "m", "Z1"), s(500, "m", "Z2")];
  return w(code, slot, "Teste 3km", ["Z1", "Z2", "Z3"], [
    sect("warmup", ...wu),
    sect("main", tst(3000, "TESTE 3KM", "Percurso plano — anotar o tempo!")),
  ], "Percurso PLANO! Teste para atualizar o pace — Terminou o Z2, água, recupera e VAI! ANOTAR O TEMPO DOS 3KM!");
}
function simulado5km(code: string, slot: 1|2|3|4|5): Workout10km {
  return w(code, slot, "Simulado 5km", ["Z1", "Z3", "Z4"], [
    sect("warmup", s(1000, "m", "Z1")),
    sect("main", s(4500, "m", "Z3"), s(500, "m", "Z4")),
  ], "Simulado de 5km — esforço de prova!");
}
function simulado10km(code: string, slot: 1|2|3|4|5): Workout10km {
  return w(code, slot, "Simulado 10km", ["Z1", "Z3", "Z4"], [
    sect("warmup", s(1000, "m", "Z1")),
    sect("main", s(9500, "m", "Z3"), s(500, "m", "Z4")),
  ], "Simulado / Prova de 10km!");
}

// ============= NÍVEL 1 — 4 planos × 4 semanas (3 slots/semana) =============

// Plano 1 — Preparação Geral (adaptação aeróbia)
const N1_P1: PhaseWeeks10km = [
  [ progressivo("T01", 1, 35, 5),  corridaRapida("T02", 2, 4, 1, 2), longaoTempo("T03", 3, 25) ],
  [ progressivo("T04", 1, 38, 6),  corridaRapida("T05", 2, 5, 1, 2), longaoTempo("T06", 3, 30) ],
  [ progressivo("T07", 1, 40, 8),  corridaRapida("T08", 2, 5, 2, 2), longaoTempo("T09", 3, 35) ],
  [ progressivo("T10", 1, 45, 10), corridaRapida("T11", 2, 6, 2, 2), longaoTempo("T12", 3, 40) ],
];

// Plano 2 — Preparação Específica (introdução de força/intervalado leve)
const N1_P2: PhaseWeeks10km = [
  [ progressivo("T01", 1, 40, 8),         subidasSec("T02", 2, 8, 30, 90),         longaoTempo("T03", 3, 35) ],
  [ subidasMin("T04", 1, 6, 1, 2),        intervaladoModerado("T05", 2, 3, 5, 3),  longaoTempo("T06", 3, 40) ],
  [ progressivo("T07", 1, 45, 10),        intervaladoModerado("T08", 2, 4, 6, 3),  longaoTempo("T09", 3, 45) ],
  [ subidasMin("T10", 1, 8, 1, 2),        intervaladoModerado("T11", 2, 4, 8, 3),  longaoTempo("T12", 3, 50) ],
];

// Plano 3 — Específico Avançado (qualidade)
const N1_P3: PhaseWeeks10km = [
  [ tempoRun("T01", 1, 12),  intervaladoLongo("T02", 2, 3, 3, 3), longaoTempo("T03", 3, 40) ],
  [ tempoRun("T04", 1, 15),  intervaladoLongo("T05", 2, 4, 3, 3), longaoTempo("T06", 3, 45) ],
  [ tempoRun("T07", 1, 18),  intervaladoLongo("T08", 2, 4, 4, 3), longaoTempo("T09", 3, 50) ],
  // Semana 4 — Slot 2 = Teste 3km (ritual de reavaliação)
  [ tempoRun("T10", 1, 20),  teste3km("T11", 2, 1),               longaoTempo("T12", 3, 55) ],
];

// Plano 4 — Polimento / Prova (taper + simulado)
const N1_P4: PhaseWeeks10km = [
  [ tempoRun("T01", 1, 18),                intervaladoLongo("T02", 2, 3, 4, 3), longaoTempo("T03", 3, 50) ],
  // Semana 2 — Slot 3 = Simulado 5km
  [ corridaRapida("T04", 1, 6, 2, 2),      regenerativo("T05", 2, 30),          simulado5km("T06", 3) ],
  [ intervaladoLongo("T07", 1, 3, 3, 3),   regenerativo("T08", 2, 30),          progressivo("T09", 3, 40, 8) ],
  // Semana da prova
  [ corridaRapida("T10", 1, 4, 1, 2),      regenerativo("T11", 2, 25, "Regenerativo curto pré-prova"), simulado10km("T12", 3) ],
];

export const LEVEL_1_10KM: PhasesByLevel10km = { 1: N1_P1, 2: N1_P2, 3: N1_P3, 4: N1_P4 };

// ============= NÍVEL 2 — 4 planos × 4 semanas (4 slots) =============

// Plano 1 — Preparação Geral
const N2_P1: PhaseWeeks10km = [
  [ progressivo("T01", 1, 45, 10), corridaRapida("T02", 2, 6, 1, 2), regenerativo("T03", 3, 30), longaoDist("T04", 4, 7) ],
  [ progressivo("T05", 1, 47, 12), corridaRapida("T06", 2, 5, 2, 2), regenerativo("T07", 3, 40), longaoDist("T08", 4, 8) ],
  [ progressivo("T09", 1, 50, 10), corridaRapida("T10", 2, 6, 2, 2), regenerativo("T11", 3, 40), longaoDist("T12", 4, 7) ],
  [ tempoRun("T13", 1, 18),        subidasSec("T14", 2, 12, 30, 90), regenerativo("T15", 3, 40), longaoDist("T16", 4, 9) ],
];

// Plano 2 — Preparação Específica
const N2_P2: PhaseWeeks10km = [
  [ progressivo("T01", 1, 60, 15), subidasMin("T02", 2, 8, 1, 2), regenerativo("T03", 3, 30), longaoDist("T04", 4, 8) ],
  [ progressivo("T05", 1, 47, 12), subidasMin("T06", 2, 6, 1, 2), regenerativo("T07", 3, 35), longaoDist("T08", 4, 8) ],
  [ intervaladoModerado("T09", 1, 4, 8, 3), intervaladoLongo("T10", 2, 3, 5, 3), regenerativo("T11", 3, 35), longaoDist("T12", 4, 10) ],
  // Semana 4 — Slot 2 = Teste 3km
  [ intervaladoLongo("T13", 1, 6, 3, 2), teste3km("T14", 2, 2), regenerativo("T15", 3, 35), longaoDist("T16", 4, 8) ],
];

// Plano 3 — Específico Avançado
const N2_P3: PhaseWeeks10km = [
  [ intervaladoLongo("T01", 1, 5, 3, 2), corridaRapida("T02", 2, 7, 1, 2), regenerativo("T03", 3, 40), corridaRapidaLonga("T04", 4, 6) ],
  [ intervaladoModerado("T05", 1, 4, 8, 3), intervaladoLongo("T06", 2, 3, 5, 3), regenerativo("T07", 3, 35), longaoDist("T08", 4, 10) ],
  [ progressivo("T09", 1, 45, 10), intervaladoLongo("T10", 2, 3, 5, 3), regenerativo("T11", 3, 35), corridaRapidaLonga("T12", 4, 7) ],
  [ intervaladoLongo("T13", 1, 6, 3, 2), corridaRapida("T14", 2, 5, 2, 2), regenerativo("T15", 3, 40), corridaRapidaLonga("T16", 4, 7) ],
];

// Plano 4 — Polimento / Prova
const N2_P4: PhaseWeeks10km = [
  [ tempoRun("T01", 1, 20), intervaladoLongo("T02", 2, 4, 5, 3), regenerativo("T03", 3, 40), longaoTempo("T04", 4, 55) ],
  // Semana 2: Slot 2 substitui Longão habitual por "longão progressivo"; Slot 4 = Simulado 5km
  [ corridaRapida("T05", 1, 8, 2, 2), longaoDist("T06", 2, 6), regenerativo("T07", 3, 30), simulado5km("T08", 4) ],
  [ intervaladoLongo("T09", 1, 3, 5, 3), corridaRapida("T10", 2, 5, 2, 2), regenerativo("T11", 3, 40), progressivo("T12", 4, 47, 12) ],
  // Semana da prova
  [ corridaRapida("T13", 1, 5, 2, 2), regenerativo("T14", 2, 40), regenerativo("T15", 3, 30, "Regenerativo curto pré-prova"), simulado10km("T16", 4) ],
];

export const LEVEL_2_10KM: PhasesByLevel10km = { 1: N2_P1, 2: N2_P2, 3: N2_P3, 4: N2_P4 };

export const WORKOUTS_10KM: Record<1 | 2, PhasesByLevel10km> = { 1: LEVEL_1_10KM, 2: LEVEL_2_10KM };

// Quantos slots por nível
export function slotCountFor10km(level: 1 | 2): number {
  return level === 1 ? 3 : 4;
}
// Quantos dias o professor pode marcar
export function allowedDayCounts(level: 1 | 2): number[] {
  return level === 1 ? [3] : [4, 5];
}
// Compat: dias padrão (TER/QUI/SAB para N1; TER/QUI/SEX/SAB para N2).
export function defaultDaysFor10km(level: 1 | 2): DayCode[] {
  return level === 1 ? ["TER", "QUI", "SAB"] : ["TER", "QUI", "SEX", "SAB"];
}
