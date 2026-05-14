// Banco de treinos da Planilha 21km (meia maratona).
// Estrutura: 5 planilhas × 4 semanas × 4 slots — para Nível 1 e Nível 2.
// Distribuição por slot (sempre 4 dias selecionados pelo professor):
//   Slot 1 → 1º dia | Slot 2 → 2º dia | Slot 3 → 3º dia (regenerativo)
//   Slot 4 → 4º (último) dia → Longão / Progressivo Longo / CR Longa
//
// Os números (min/m/séries) seguem a spec de Passos 5–14. Duração e volume
// são calculados dinamicamente em planilha-21km-stats.ts a partir do FTP.

import {
  DAY_ORDER, DAY_LABEL, DAY_FULL,
  type DayCode, type ZoneId, type Item, type Single, type Intervals, type Test,
  type SectionName, type Section, type Unit,
} from "./planilha-5km-data";

export { DAY_ORDER, DAY_LABEL, DAY_FULL };
export type { DayCode, ZoneId, Item, SectionName };

export type WorkoutType21km =
  | "Base aeróbia" | "Progressivo" | "Corrida Rápida" | "Subidas"
  | "Regenerativo" | "Tempo Run" | "Intervalado Longo" | "Intervalado Curto"
  | "Intervalado Moderado" | "Corrida Rápida Longa"
  | "Longão" | "Progressivo Longo" | "Teste 3km" | "Simulado 21km";

export const WORKOUT_TYPES_21KM: Record<WorkoutType21km, { color: string; intense: boolean }> = {
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
  "Progressivo Longo":     { color: "bg-teal-200 text-teal-950 border-teal-500 dark:bg-teal-900/60 dark:text-teal-100 dark:border-teal-600", intense: true },
  "Teste 3km":             { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
  "Simulado 21km":         { color: "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-500", intense: true },
};

export type Phase21 = 1 | 2 | 3 | 4 | 5;

export const PHASE_LABELS_21KM: Record<Phase21, { title: string; subtitle: string }> = {
  1: { title: "Planilha 1", subtitle: "Preparação Geral" },
  2: { title: "Planilha 2", subtitle: "Preparação Específica" },
  3: { title: "Planilha 3", subtitle: "Específico Avançado" },
  4: { title: "Planilha 4", subtitle: "Específico com Teste" },
  5: { title: "Planilha 5", subtitle: "Polimento / Prova" },
};

export type Workout21km = {
  code: string;
  slot: 1 | 2 | 3 | 4;
  type: WorkoutType21km;
  zones: ZoneId[];
  sections: Section[];
  note?: string;
};
export type WeekWorkouts21km = Workout21km[];
export type PhaseWeeks21km = [WeekWorkouts21km, WeekWorkouts21km, WeekWorkouts21km, WeekWorkouts21km];
export type PhasesByLevel21km = Record<Phase21, PhaseWeeks21km>;

// ---------- Builders ----------
const s = (value: number, unit: Unit, zone: ZoneId): Single => ({ kind: "single", value, unit, zone });
const iv = (reps: number, on: Single, off: Single): Intervals => ({ kind: "intervals", reps, on, off });
const tst = (meters: number, label: string, note?: string): Test => ({ kind: "test", meters, label, note });
const sect = (name: SectionName, ...items: Item[]): Section => ({ name, items });
const w = (
  code: string, slot: 1 | 2 | 3 | 4, type: WorkoutType21km, zones: ZoneId[],
  sections: Section[], note?: string,
): Workout21km => ({ code, slot, type, zones, sections, note });

function progressivo(code: string, slot: 1|2|3|4, durMin: number, z3Min: number): Workout21km {
  const z2 = Math.max(3, durMin - 10 - z3Min);
  return w(code, slot, "Progressivo", ["Z1","Z2","Z3"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2, "min", "Z2"), s(z3Min, "min", "Z3")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function progressivoNoRec(code: string, slot: 1|2|3|4, z2Min: number, z3Min: number): Workout21km {
  return w(code, slot, "Progressivo", ["Z1","Z2","Z3"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2Min, "min", "Z2"), s(z3Min, "min", "Z3")),
  ]);
}
function corridaRapida(code: string, slot: 1|2|3|4, reps: number, onMin: number, offMin: number): Workout21km {
  return w(code, slot, "Corrida Rápida", ["Z1","Z2","Z4"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function subidasSec(code: string, slot: 1|2|3|4, reps: number, onSec: number, offSec: number): Workout21km {
  return w(code, slot, "Subidas", ["Z1","Z2","Z5"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onSec, "sec", "Z5"), s(offSec, "sec", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
function subidasMin(code: string, slot: 1|2|3|4, reps: number, onMin: number, offMin: number): Workout21km {
  return w(code, slot, "Subidas", ["Z1","Z2","Z5"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z5"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
type TempoOpts = { wuZ1?: number; recZ2?: number; recZ1?: number };
function tempoRun(code: string, slot: 1|2|3|4, z3Min: number, opts: TempoOpts = {}): Workout21km {
  const wuZ1 = opts.wuZ1 ?? 5;
  const recZ2 = opts.recZ2 ?? 5;
  const recZ1 = opts.recZ1 ?? 5;
  return w(code, slot, "Tempo Run", ["Z1","Z2","Z3"], [
    sect("warmup", s(wuZ1, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", s(z3Min, "min", "Z3")),
    sect("recovery", s(recZ2, "min", "Z2"), s(recZ1, "min", "Z1")),
  ]);
}
type IvOpts = { wuZ1?: number; recZ1?: number };
function intervaladoLongo(code: string, slot: 1|2|3|4, reps: number, onMin: number, offMin: number, opts: IvOpts = {}): Workout21km {
  const wuZ1 = opts.wuZ1 ?? 5;
  const recZ1 = opts.recZ1 ?? 5;
  return w(code, slot, "Intervalado Longo", ["Z1","Z2","Z4"], [
    sect("warmup", s(wuZ1, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z4"), s(offMin, "min", "Z1"))),
    sect("recovery", s(recZ1, "min", "Z1")),
  ]);
}
function intervaladoModerado(code: string, slot: 1|2|3|4, reps: number, onMin: number, offMin: number): Workout21km {
  return w(code, slot, "Intervalado Moderado", ["Z1","Z2","Z3"], [
    sect("warmup", s(5, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onMin, "min", "Z3"), s(offMin, "min", "Z1"))),
    sect("recovery", s(5, "min", "Z2"), s(5, "min", "Z1")),
  ]);
}
// Intervalado Curto Z5 — séries em segundos, com warmup/recovery configuráveis
function intervaladoCurto(code: string, slot: 1|2|3|4, reps: number, onSec: number, offSec: number, opts: IvOpts = {}): Workout21km {
  const wuZ1 = opts.wuZ1 ?? 5;
  const recZ1 = opts.recZ1 ?? 5;
  return w(code, slot, "Intervalado Curto", ["Z1","Z2","Z5"], [
    sect("warmup", s(wuZ1, "min", "Z1"), s(5, "min", "Z2")),
    sect("main", iv(reps, s(onSec, "sec", "Z5"), s(offSec, "sec", "Z1"))),
    sect("recovery", s(recZ1, "min", "Z1")),
  ]);
}
type CrLongaOpts = { wuZ1m?: number; recZ1m?: number };
function corridaRapidaLonga(code: string, slot: 1|2|3|4, reps: number, opts: CrLongaOpts = {}): Workout21km {
  const wuZ1m = opts.wuZ1m ?? 800;
  const recZ1m = opts.recZ1m ?? 800;
  return w(code, slot, "Corrida Rápida Longa", ["Z1","Z2","Z3"], [
    sect("warmup", s(wuZ1m, "m", "Z1"), s(1600, "m", "Z2")),
    sect("main", iv(reps, s(400, "m", "Z3"), s(1200, "m", "Z2"))),
    sect("recovery", s(recZ1m, "m", "Z1")),
  ]);
}
function regenerativo(code: string, slot: 1|2|3|4, durMin: number, note?: string): Workout21km {
  return w(code, slot, "Regenerativo", ["Z1"], [sect("main", s(durMin, "min", "Z1"))], note);
}
function baseAerobia(code: string, slot: 1|2|3|4, durMin: number): Workout21km {
  const z2 = Math.max(5, durMin - 10);
  return w(code, slot, "Base aeróbia", ["Z1","Z2"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2, "min", "Z2")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
type LongaoOpts = { wuZ1m?: number; recZ1m?: number };
function longaoDist(code: string, slot: 1|2|3|4, z2Km: number, opts: LongaoOpts = {}): Workout21km {
  const wuZ1m = opts.wuZ1m ?? 2000;
  const recZ1m = opts.recZ1m ?? 1000;
  return w(code, slot, "Longão", ["Z1","Z2"], [
    sect("warmup", s(wuZ1m, "m", "Z1")),
    sect("main", s(z2Km * 1000, "m", "Z2")),
    sect("recovery", s(recZ1m, "m", "Z1")),
  ]);
}
function longaoTempo(code: string, slot: 1|2|3|4, z2Min: number): Workout21km {
  return w(code, slot, "Longão", ["Z1","Z2"], [
    sect("warmup", s(5, "min", "Z1")),
    sect("main", s(z2Min, "min", "Z2")),
    sect("recovery", s(5, "min", "Z1")),
  ]);
}
// Progressivo Longo — bloco em metros: Z1 + Z2 + Z3 (sem recovery, Z3 é finalização)
function progressivoLongo(code: string, slot: 1|2|3|4, z1m: number, z2m: number, z3m: number): Workout21km {
  return w(code, slot, "Progressivo Longo", ["Z1","Z2","Z3"], [
    sect("warmup", s(z1m, "m", "Z1")),
    sect("main", s(z2m, "m", "Z2"), s(z3m, "m", "Z3")),
  ]);
}
function teste3km(code: string, slot: 1|2|3|4): Workout21km {
  return w(code, slot, "Teste 3km", ["Z1","Z2","Z3"], [
    sect("warmup", s(500, "m", "Z1"), s(500, "m", "Z2")),
    sect("main", tst(3000, "TESTE 3KM", "Percurso plano — anotar o tempo!")),
  ], "Percurso PLANO! Teste para atualizar o pace — Terminou o Z2, água, recupera e VAI! ANOTAR O TEMPO DOS 3KM!");
}
function simulado21km(code: string, slot: 1|2|3|4, z2m: number, z3m: number): Workout21km {
  return w(code, slot, "Simulado 21km", ["Z1","Z2","Z3"], [
    sect("warmup", s(1000, "m", "Z1")),
    sect("main", s(z2m, "m", "Z2"), s(z3m, "m", "Z3")),
  ], "Simulado / Prova de meia maratona — 22.095m total!");
}

// ============= NÍVEL 1 — 5 planilhas × 4 semanas × 4 slots =============

// Planilha 1 — Preparação Geral (Passo 5)
const N1_P1: PhaseWeeks21km = [
  [ progressivo("T01",1,45,10), corridaRapida("T02",2,5,2,2), regenerativo("T03",3,35), baseAerobia("T04",4,60) ],
  [ progressivo("T05",1,52,12), corridaRapida("T06",2,6,2,2), regenerativo("T07",3,40), baseAerobia("T08",4,65) ],
  [ tempoRun("T09",1,15),       corridaRapida("T10",2,6,1,2), regenerativo("T11",3,40), baseAerobia("T12",4,70) ],
  [ progressivo("T13",1,47,12), subidasSec("T14",2,12,30,90), regenerativo("T15",3,40), baseAerobia("T16",4,50) ],
];

// Planilha 2 — Passo 6 (Sem 4 Slot 1 = Teste 3km)
const N1_P2: PhaseWeeks21km = [
  [ progressivo("T01",1,52,12), subidasMin("T02",2,5,1,2),    regenerativo("T03",3,40), longaoDist("T04",4,9,{wuZ1m:1000}) ],
  [ tempoRun("T05",1,18),       corridaRapida("T06",2,7,2,2), regenerativo("T07",3,40), longaoDist("T08",4,10,{wuZ1m:1000}) ],
  [ progressivo("T09",1,45,10), intervaladoLongo("T10",2,4,3,2), regenerativo("T11",3,40), longaoDist("T12",4,11,{wuZ1m:1000}) ],
  [ teste3km("T13",1),          corridaRapida("T14",2,8,2,2), regenerativo("T15",3,30), baseAerobia("T16",4,60) ],
];

// Planilha 3 — Passo 7
const N1_P3: PhaseWeeks21km = [
  [ progressivo("T01",1,57,12), subidasSec("T02",2,10,30,90),  regenerativo("T03",3,40), longaoDist("T04",4,12,{wuZ1m:1000}) ],
  [ progressivo("T05",1,50,15), intervaladoLongo("T06",2,5,3,2), regenerativo("T07",3,40), corridaRapidaLonga("T08",4,7,{recZ1m:800}) ],
  [ tempoRun("T09",1,18),       intervaladoCurto("T10",2,8,60,120), regenerativo("T11",3,40), longaoDist("T12",4,9,{wuZ1m:2000}) ],
  [ corridaRapida("T13",1,8,2,2), subidasSec("T14",2,10,30,90), regenerativo("T15",3,40), corridaRapidaLonga("T16",4,8,{recZ1m:800}) ],
];

// Planilha 4 — Específico (Passo 8) — Sem 4 Slot 1 = Teste 3km
const N1_P4: PhaseWeeks21km = [
  [ tempoRun("T01",1,20),                intervaladoLongo("T02",2,4,5,3),   regenerativo("T03",3,50), progressivoLongo("T04",4,1000,6000,5000) ],
  [ intervaladoModerado("T05",1,4,5,3),  baseAerobia("T06",2,60),           regenerativo("T07",3,50), corridaRapidaLonga("T08",4,8,{recZ1m:800}) ],
  [ tempoRun("T09",1,20),                subidasMin("T10",2,8,1,2),         regenerativo("T11",3,50), progressivoLongo("T12",4,1000,10000,4000) ],
  [ teste3km("T13",1),                   intervaladoLongo("T14",2,6,3,2),   regenerativo("T15",3,40), corridaRapidaLonga("T16",4,8,{recZ1m:800}) ],
];

// Planilha 5 — Polimento / Prova (Passo 9)
const N1_P5: PhaseWeeks21km = [
  [ progressivo("T01",1,52,12),         intervaladoLongo("T02",2,4,5,3),  regenerativo("T03",3,40), progressivoLongo("T04",4,1000,11000,6000) ],
  [ intervaladoLongo("T05",1,5,3,2),    progressivoNoRec("T06",2,35,12),  regenerativo("T07",3,40), progressivoLongo("T08",4,1000,4000,8000) ],
  [ intervaladoCurto("T09",1,8,60,120), progressivo("T10",2,47,12),       regenerativo("T11",3,40), baseAerobia("T12",4,60) ],
  // Semana da Prova
  [ corridaRapida("T13",1,4,2,2),       regenerativo("T14",2,50),         regenerativo("T15",3,20,"Regenerativo curto pré-prova"), simulado21km("T16",4,13000,8095) ],
];

export const LEVEL_1_21KM: PhasesByLevel21km = { 1: N1_P1, 2: N1_P2, 3: N1_P3, 4: N1_P4, 5: N1_P5 };

// ============= NÍVEL 2 — 5 planilhas × 4 semanas × 4 slots =============

// Planilha 1 — Preparação Geral (Passo 10)
const N2_P1: PhaseWeeks21km = [
  [ progressivo("T01",1,40,10), corridaRapida("T02",2,6,2,2), regenerativo("T03",3,35), longaoDist("T04",4,8) ],
  [ progressivo("T05",1,50,10), corridaRapida("T06",2,7,2,2), regenerativo("T07",3,40), longaoDist("T08",4,9) ],
  [ tempoRun("T09",1,15),       corridaRapida("T10",2,6,1,2), regenerativo("T11",3,40), longaoDist("T12",4,7) ],
  [ progressivo("T13",1,47,12), subidasSec("T14",2,12,30,90), regenerativo("T15",3,40), longaoDist("T16",4,11) ],
];

// Planilha 2 — Específica (Passo 11) — Sem 4 Slot 1 = Teste 3km
const N2_P2: PhaseWeeks21km = [
  [ progressivo("T01",1,57,12),        intervaladoLongo("T02",2,4,3,2),    regenerativo("T03",3,40), longaoDist("T04",4,13) ],
  [ tempoRun("T05",1,18),              subidasSec("T06",2,10,30,90),       regenerativo("T07",3,40), longaoDist("T08",4,14) ],
  [ tempoRun("T09",1,20,{wuZ1:10}),    intervaladoLongo("T10",2,6,3,2),    regenerativo("T11",3,40), corridaRapidaLonga("T12",4,8,{wuZ1m:800,recZ1m:800}) ],
  [ teste3km("T13",1),                 intervaladoCurto("T14",2,8,90,150,{wuZ1:10,recZ1:10}), regenerativo("T15",3,40), corridaRapidaLonga("T16",4,10,{recZ1m:800}) ],
];

// Planilha 3 — Específico Avançado (Passo 12)
const N2_P3: PhaseWeeks21km = [
  [ progressivo("T01",1,60,10),                                  intervaladoLongo("T02",2,4,5,3),                  regenerativo("T03",3,55), progressivoLongo("T04",4,1000,4000,7000) ],
  [ tempoRun("T05",1,24,{wuZ1:10,recZ2:10,recZ1:5}),             intervaladoLongo("T06",2,3,5,3,{wuZ1:10,recZ1:10}), regenerativo("T07",3,50), corridaRapidaLonga("T08",4,10,{wuZ1m:1600,recZ1m:800}) ],
  [ tempoRun("T09",1,18,{wuZ1:10,recZ2:5,recZ1:10}),             intervaladoLongo("T10",2,4,5,3,{wuZ1:10,recZ1:10}), regenerativo("T11",3,50), progressivoLongo("T12",4,1000,5000,9000) ],
  [ tempoRun("T13",1,24,{wuZ1:10,recZ2:5,recZ1:15}),             intervaladoLongo("T14",2,3,5,3,{wuZ1:10,recZ1:10}), regenerativo("T15",3,50), corridaRapidaLonga("T16",4,8,{wuZ1m:1600,recZ1m:1600}) ],
];

// Planilha 4 — Específico com Teste (Passo 13) — Sem 4 Slot 1 = Teste 3km
const N2_P4: PhaseWeeks21km = [
  [ tempoRun("T01",1,18,{wuZ1:10,recZ2:10,recZ1:5}),  intervaladoLongo("T02",2,4,5,3),                regenerativo("T03",3,45), corridaRapidaLonga("T04",4,12,{wuZ1m:1600,recZ1m:800}) ],
  [ progressivo("T05",1,60,15),                       intervaladoLongo("T06",2,5,5,3,{wuZ1:10,recZ1:5}), regenerativo("T07",3,50), progressivoLongo("T08",4,1000,10000,5000) ],
  [ tempoRun("T09",1,28,{wuZ1:10,recZ2:5,recZ1:10}),  intervaladoLongo("T10",2,5,3,2,{wuZ1:10,recZ1:15}), regenerativo("T11",3,50), corridaRapidaLonga("T12",4,10,{wuZ1m:1600,recZ1m:800}) ],
  [ teste3km("T13",1),                                baseAerobia("T14",2,70),                        regenerativo("T15",3,50), progressivoLongo("T16",4,1000,8000,8000) ],
];

// Planilha 5 — Polimento / Prova (Passo 14)
const N2_P5: PhaseWeeks21km = [
  [ progressivo("T01",1,65,15),                       intervaladoLongo("T02",2,5,5,3,{wuZ1:10,recZ1:20}), regenerativo("T03",3,40), progressivoLongo("T04",4,1000,10000,6000) ],
  [ tempoRun("T05",1,24,{wuZ1:10,recZ2:5,recZ1:15}),  subidasSec("T06",2,12,30,90),                       regenerativo("T07",3,40), progressivoLongo("T08",4,1000,6000,6000) ],
  [ tempoRun("T09",1,18,{wuZ1:10,recZ2:5,recZ1:20}),  corridaRapida("T10",2,6,1,2),                       regenerativo("T11",3,50), corridaRapidaLonga("T12",4,8,{wuZ1m:800,recZ1m:800}) ],
  // Semana da Prova
  [ corridaRapida("T13",1,5,2,2),                     regenerativo("T14",2,50),                           regenerativo("T15",3,20,"Regenerativo curto pré-prova"), simulado21km("T16",4,17000,4095) ],
];

export const LEVEL_2_21KM: PhasesByLevel21km = { 1: N2_P1, 2: N2_P2, 3: N2_P3, 4: N2_P4, 5: N2_P5 };

export const WORKOUTS_21KM: Record<1 | 2, PhasesByLevel21km> = { 1: LEVEL_1_21KM, 2: LEVEL_2_21KM };

export function slotCountFor21km(_level: 1 | 2): number { return 4; }
export function allowedDayCounts21km(_level: 1 | 2): number[] { return [4]; }
export function defaultDaysFor21km(_level: 1 | 2): DayCode[] { return ["TER","QUI","SEX","SAB"]; }
