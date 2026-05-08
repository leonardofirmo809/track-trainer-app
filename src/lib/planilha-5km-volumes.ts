// Tabela de duração e volume por treino — Planilha 5KM.
// Indexada por nível, fase (1..4), índice da semana (0..3) e código do treino.

export type WorkoutStat = { durationMin: number; volumeM: number; label?: string };

type ByCode = Record<string, WorkoutStat>;
type ByWeek = [ByCode, ByCode, ByCode, ByCode];
type ByPhase = Record<1 | 2 | 3 | 4, ByWeek>;
type ByLevel = Record<1 | 2, ByPhase>;

export const WORKOUT_STATS: ByLevel = {
  1: {
    1: [
      { T01: { durationMin: 25, volumeM: 4332 }, T02: { durationMin: 27, volumeM: 4722 }, T03: { durationMin: 30, volumeM: 5245 } },
      { T04: { durationMin: 30, volumeM: 5308 }, T05: { durationMin: 30, volumeM: 5150 }, T06: { durationMin: 30, volumeM: 5245 } },
      { T07: { durationMin: 35, volumeM: 6220 }, T08: { durationMin: 31, volumeM: 5461 }, T09: { durationMin: 35, volumeM: 6157 } },
      { T10: { durationMin: 38, volumeM: 6806 }, T11: { durationMin: 27, volumeM: 4666 }, T12: { durationMin: 35, volumeM: 6157 } },
    ],
    2: [
      { T01: { durationMin: 40, volumeM: 6472 }, T02: { durationMin: 35, volumeM: 5575 }, T03: { durationMin: 40, volumeM: 6358 } },
      { T04: { durationMin: 45, volumeM: 7292 }, T05: { durationMin: 33, volumeM: 5108 }, T06: { durationMin: 45, volumeM: 7179 } },
      { T07: { durationMin: 35, volumeM: 5708 }, T08: { durationMin: 31, volumeM: 4911 }, T09: { durationMin: 40, volumeM: 6358 } },
      { T10: { durationMin: 35, volumeM: 5538 }, T11: { durationMin: 22, volumeM: 4000, label: "TESTE 3KM" }, T12: { durationMin: 50, volumeM: 8000 } },
    ],
    3: [
      { T01: { durationMin: 37, volumeM: 6362 }, T02: { durationMin: 30, volumeM: 5102 }, T03: { durationMin: 45, volumeM: 7610 } },
      { T04: { durationMin: 35, volumeM: 6050 }, T05: { durationMin: 39, volumeM: 6614 }, T06: { durationMin: 40, volumeM: 6740 } },
      { T07: { durationMin: 42, volumeM: 7232 }, T08: { durationMin: 33, volumeM: 5414 }, T09: { durationMin: 35, volumeM: 5870 } },
      { T10: { durationMin: 39, volumeM: 6614 }, T11: { durationMin: 27, volumeM: 4448 }, T12: { durationMin: 40, volumeM: 6740 } },
    ],
    4: [
      { T01: { durationMin: 35, volumeM: 6006 }, T02: { durationMin: 31, volumeM: 5134 }, T03: { durationMin: 45, volumeM: 7610 } },
      { T04: { durationMin: 40, volumeM: 6860 }, T05: { durationMin: 27, volumeM: 4448 }, T06: { durationMin: 40, volumeM: 6740 } },
      { T07: { durationMin: 35, volumeM: 6050 }, T08: { durationMin: 35, volumeM: 6006 }, T09: { durationMin: 40, volumeM: 6740 } },
      { T10: { durationMin: 31, volumeM: 5206 }, T11: { durationMin: 20, volumeM: 3040, label: "REGENERATIVO" }, T12: { durationMin: 31, volumeM: 5620, label: "SIMULADO" } },
    ],
  },
  2: {
    1: [
      { T01: { durationMin: 38, volumeM: 6707 }, T02: { durationMin: 35, volumeM: 6048 }, T03: { durationMin: 30, volumeM: 5000 }, T04: { durationMin: 50, volumeM: 9000 } },
      { T05: { durationMin: 35, volumeM: 6274 }, T06: { durationMin: 35, volumeM: 6274 }, T07: { durationMin: 35, volumeM: 5833 }, T08: { durationMin: 60, volumeM: 10000, label: "LONGÃO 6km+2km" } },
      { T09: { durationMin: 35, volumeM: 6274 }, T10: { durationMin: 35, volumeM: 6274 }, T11: { durationMin: 35, volumeM: 5833 }, T12: { durationMin: 70, volumeM: 12000, label: "LONGÃO 7km+2km" } },
      { T13: { durationMin: 45, volumeM: 8107 }, T14: { durationMin: 35, volumeM: 6274 }, T15: { durationMin: 40, volumeM: 6667 }, T16: { durationMin: 40, volumeM: 7167 } },
    ],
    2: [
      { T01: { durationMin: 35, volumeM: 6274 }, T02: { durationMin: 33, volumeM: 5917 }, T03: { durationMin: 30, volumeM: 5000 }, T04: { durationMin: 55, volumeM: 9800 } },
      { T05: { durationMin: 40, volumeM: 7167 }, T06: { durationMin: 40, volumeM: 7167 }, T07: { durationMin: 35, volumeM: 5833 }, T08: { durationMin: 65, volumeM: 11667 } },
      { T09: { durationMin: 30, volumeM: 5373 }, T10: { durationMin: 33, volumeM: 5917 }, T11: { durationMin: 40, volumeM: 6667 }, T12: { durationMin: 75, volumeM: 13500 } },
      { T13: { durationMin: 40, volumeM: 7167 }, T14: { durationMin: 32, volumeM: 5740, label: "TESTE 3KM" }, T15: { durationMin: 35, volumeM: 5833 }, T16: { durationMin: 47, volumeM: 8417 } },
    ],
    3: [
      { T01: { durationMin: 38, volumeM: 6234 }, T02: { durationMin: 35, volumeM: 5666 }, T03: { durationMin: 40, volumeM: 5736 }, T04: { durationMin: 75, volumeM: 11930, label: "LONGÃO 8km" } },
      { T05: { durationMin: 40, volumeM: 6585 }, T06: { durationMin: 39, volumeM: 6375 }, T07: { durationMin: 50, volumeM: 7170 }, T08: { durationMin: 43, volumeM: 6964 } },
      { T09: { durationMin: 45, volumeM: 7179 }, T10: { durationMin: 39, volumeM: 6285 }, T11: { durationMin: 35, volumeM: 5019 }, T12: { durationMin: 60, volumeM: 9811 } },
      { T13: { durationMin: 39, volumeM: 6240 }, T14: { durationMin: 35, volumeM: 5491 }, T15: { durationMin: 40, volumeM: 5736 }, T16: { durationMin: 81, volumeM: 12930, label: "LONGÃO 9km" } },
    ],
    4: [
      { T01: { durationMin: 30, volumeM: 4813 }, T02: { durationMin: 39, volumeM: 6285 }, T03: { durationMin: 40, volumeM: 5736 }, T04: { durationMin: 52, volumeM: 8464 } },
      { T05: { durationMin: 39, volumeM: 6358 }, T06: { durationMin: 47, volumeM: 7749 }, T07: { durationMin: 30, volumeM: 4302 }, T08: { durationMin: 60, volumeM: 9811 } },
      { T09: { durationMin: 45, volumeM: 7292 }, T10: { durationMin: 40, volumeM: 6585 }, T11: { durationMin: 30, volumeM: 4302 }, T12: { durationMin: 87, volumeM: 13930, label: "LONGÃO 9km+2km" } },
      { T13: { durationMin: 35, volumeM: 5575 }, T14: { durationMin: 25, volumeM: 3585 }, T15: { durationMin: 40, volumeM: 5736 }, T16: { durationMin: 33, volumeM: 5620, label: "SIMULADO" } },
    ],
  },
};

export function getStats(level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string): WorkoutStat | null {
  return WORKOUT_STATS[level]?.[phase]?.[weekIdx]?.[code] ?? null;
}

export function formatHm(totalMin: number): string {
  const min = Math.round(totalMin);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}
