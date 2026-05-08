// Tabela de duração e volume por treino — Planilha 10KM.
import { formatHm, formatKm } from "./planilha-5km-volumes";

export { formatHm, formatKm };
export type WorkoutStat = { durationMin: number; volumeM: number; label?: string };

type ByCode = Record<string, WorkoutStat>;
type ByWeek = [ByCode, ByCode, ByCode, ByCode];
type ByPhase = Record<1 | 2 | 3 | 4, ByWeek>;
type ByLevel = Record<1 | 2, ByPhase>;

export const WORKOUT_STATS_10KM: ByLevel = {
  1: {
    1: [
      { T01: { durationMin: 40, volumeM: 6476 }, T02: { durationMin: 31, volumeM: 4958 }, T03: { durationMin: 35, volumeM: 5590 } },
      { T04: { durationMin: 38, volumeM: 6179 }, T05: { durationMin: 30, volumeM: 4676 }, T06: { durationMin: 40, volumeM: 6419 } },
      { T07: { durationMin: 40, volumeM: 6533 }, T08: { durationMin: 39, volumeM: 6299 }, T09: { durationMin: 45, volumeM: 7248 } },
      { T10: { durationMin: 35, volumeM: 5762, label: "Tempo Run" }, T11: { durationMin: 27, volumeM: 4236 }, T12: { durationMin: 50, volumeM: 8076 } },
    ],
    2: [
      { T01: { durationMin: 45, volumeM: 7292 }, T02: { durationMin: 31, volumeM: 4843 }, T03: { durationMin: 50, volumeM: 8000 } },
      { T04: { durationMin: 47, volumeM: 7643 }, T05: { durationMin: 33, volumeM: 5277 }, T06: { durationMin: 55, volumeM: 8821 } },
      { T07: { durationMin: 35, volumeM: 5708, label: "Tempo Run" }, T08: { durationMin: 39, volumeM: 6240 }, T09: { durationMin: 40, volumeM: 6358 } },
      { T10: { durationMin: 33, volumeM: 5277 }, T11: { durationMin: 22, volumeM: 4000, label: "TESTE 3KM" }, T12: { durationMin: 50, volumeM: 8000 } },
    ],
    3: [
      { T01: { durationMin: 47, volumeM: 7643 }, T02: { durationMin: 47, volumeM: 7428, label: "Intervalado Moderado" }, T03: { durationMin: 60, volumeM: 9642 } },
      { T04: { durationMin: 38, volumeM: 6234, label: "Tempo Run" }, T05: { durationMin: 35, volumeM: 5490 }, T06: { durationMin: 65, volumeM: 10462 } },
      { T07: { durationMin: 45, volumeM: 7292 }, T08: { durationMin: 35, volumeM: 5666 }, T09: { durationMin: 50, volumeM: 8000 } },
      { T10: { durationMin: 55, volumeM: 8934 }, T11: { durationMin: 40, volumeM: 6519 }, T12: { durationMin: 60, volumeM: 9642 } },
    ],
    4: [
      { T01: { durationMin: 35, volumeM: 5666 }, T02: { durationMin: 52, volumeM: 8464 }, T03: { durationMin: 70, volumeM: 11283 } },
      { T04: { durationMin: 40, volumeM: 6519 }, T05: { durationMin: 57, volumeM: 9285 }, T06: { durationMin: 45, volumeM: 7179 } },
      { T07: { durationMin: 45, volumeM: 7372 }, T08: { durationMin: 50, volumeM: 8170 }, T09: { durationMin: 55, volumeM: 8821 } },
      { T10: { durationMin: 35, volumeM: 5575 }, T11: { durationMin: 30, volumeM: 4302, label: "Regenerativo" }, T12: { durationMin: 60, volumeM: 10270, label: "SIMULADO 10KM" } },
    ],
  },
  2: {
    1: [
      { T01: { durationMin: 45, volumeM: 7292 }, T02: { durationMin: 33, volumeM: 5108 }, T03: { durationMin: 30, volumeM: 4302 }, T04: { durationMin: 62, volumeM: 10000, label: "Longão 6km" } },
      { T05: { durationMin: 47, volumeM: 7643 }, T06: { durationMin: 35, volumeM: 5575 }, T07: { durationMin: 40, volumeM: 5736 }, T08: { durationMin: 68, volumeM: 11000, label: "Longão 7km" } },
      { T09: { durationMin: 50, volumeM: 8113 }, T10: { durationMin: 39, volumeM: 6240 }, T11: { durationMin: 40, volumeM: 5736 }, T12: { durationMin: 62, volumeM: 10000, label: "Longão 6km" } },
      { T13: { durationMin: 38, volumeM: 6234, label: "Tempo Run" }, T14: { durationMin: 39, volumeM: 6138 }, T15: { durationMin: 40, volumeM: 5736 }, T16: { durationMin: 74, volumeM: 12000, label: "Longão 8km" } },
    ],
    2: [
      { T01: { durationMin: 60, volumeM: 9811 }, T02: { durationMin: 39, volumeM: 6285 }, T03: { durationMin: 30, volumeM: 4302 }, T04: { durationMin: 80, volumeM: 13000, label: "Longão 9km" } },
      { T05: { durationMin: 47, volumeM: 7643 }, T06: { durationMin: 33, volumeM: 5277 }, T07: { durationMin: 35, volumeM: 5019 }, T08: { durationMin: 68, volumeM: 11000, label: "Longão 7km" } },
      { T09: { durationMin: 43, volumeM: 6904 }, T10: { durationMin: 50, volumeM: 8000 }, T11: { durationMin: 40, volumeM: 5736 }, T12: { durationMin: 62, volumeM: 10106 } },
      { T13: { durationMin: 43, volumeM: 6904 }, T14: { durationMin: 26, volumeM: 4290, label: "TESTE 3KM" }, T15: { durationMin: 35, volumeM: 5019 }, T16: { durationMin: 68, volumeM: 11000, label: "Longão 7km" } },
    ],
    3: [
      { T01: { durationMin: 40, volumeM: 6519 }, T02: { durationMin: 36, volumeM: 5583 }, T03: { durationMin: 40, volumeM: 5736 }, T04: { durationMin: 68, volumeM: 11200, label: "Corrida Rápida Longa" } },
      { T05: { durationMin: 40, volumeM: 6519 }, T06: { durationMin: 38, volumeM: 6234, label: "Tempo Run" }, T07: { durationMin: 40, volumeM: 5736 }, T08: { durationMin: 87, volumeM: 13000, label: "Longão 9km" } },
      { T09: { durationMin: 64, volumeM: 10411, label: "Intervalado Moderado" }, T10: { durationMin: 39, volumeM: 6375 }, T11: { durationMin: 35, volumeM: 5019 }, T12: { durationMin: 55, volumeM: 8934 } },
      { T13: { durationMin: 45, volumeM: 7372 }, T14: { durationMin: 40, volumeM: 6472 }, T15: { durationMin: 40, volumeM: 5736 }, T16: { durationMin: 77, volumeM: 12800, label: "Corrida Rápida Longa" } },
    ],
    4: [
      { T01: { durationMin: 40, volumeM: 6585, label: "Tempo Run" }, T02: { durationMin: 47, volumeM: 7749 }, T03: { durationMin: 40, volumeM: 5736 }, T04: { durationMin: 65, volumeM: 10462 } },
      { T05: { durationMin: 47, volumeM: 7568 }, T06: { durationMin: 63, volumeM: 9930, label: "Longão" }, T07: { durationMin: 30, volumeM: 4302 }, T08: { durationMin: 96, volumeM: 16000, label: "Corrida Rápida Longa — maior longão" } },
      { T09: { durationMin: 39, volumeM: 6375 }, T10: { durationMin: 47, volumeM: 7643 }, T11: { durationMin: 30, volumeM: 4302 }, T12: { durationMin: 33, volumeM: 5620, label: "SIMULADO 10KM" } },
      { T13: { durationMin: 35, volumeM: 5575 }, T14: { durationMin: 40, volumeM: 5736 }, T15: { durationMin: 65, volumeM: 9840, label: "Regenerativo pré-prova" }, T16: { durationMin: 60, volumeM: 10270, label: "SIMULADO 10KM" } },
    ],
  },
};

export function getStats10km(level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string): WorkoutStat | null {
  return WORKOUT_STATS_10KM[level]?.[phase]?.[weekIdx]?.[code] ?? null;
}
