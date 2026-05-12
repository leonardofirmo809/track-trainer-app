// Cálculo dinâmico de duração e volume da Planilha 10km a partir do FTP do aluno.
// Substitui a tabela hard-coded em planilha-10km-volumes.ts.

import type { Item, ZoneId } from "./planilha-5km-data";
import type { Workout10km } from "./planilha-10km-data";
import { WORKOUTS_10KM } from "./planilha-10km-data";

// Multiplicadores de pace por zona (pace = ftp * mult). Maior = mais lento.
// Z5 = "máx" — para estimativa de volume/duração usamos Z4 como aproximação.
const ZONE_PACE_MULT: Record<ZoneId, number> = {
  Z1: 1.3156,
  Z2: 1.1500,
  Z3: 1.0000,
  Z4: 0.8700,
  Z5: 0.8700,
};

export function paceSecForZone(ftpSecPerKm: number, zone: ZoneId): number {
  return ftpSecPerKm * ZONE_PACE_MULT[zone];
}

// Para um Item, retorna { sec, m } — duração em segundos e distância em metros.
function itemStats(it: Item, ftp: number): { sec: number; m: number } {
  if (it.kind === "single") {
    if (it.unit === "min") {
      const sec = it.value * 60;
      const m = (sec / paceSecForZone(ftp, it.zone)) * 1000;
      return { sec, m };
    }
    if (it.unit === "sec") {
      const m = (it.value / paceSecForZone(ftp, it.zone)) * 1000;
      return { sec: it.value, m };
    }
    // metros
    const sec = (it.value / 1000) * paceSecForZone(ftp, it.zone);
    return { sec, m: it.value };
  }
  if (it.kind === "intervals") {
    const onSec = it.on.unit === "min" ? it.on.value * 60 : it.on.unit === "sec" ? it.on.value : (it.on.value / 1000) * paceSecForZone(ftp, it.on.zone);
    const onM = it.on.unit === "m" ? it.on.value : (onSec / paceSecForZone(ftp, it.on.zone)) * 1000;
    const offSec = it.off.unit === "min" ? it.off.value * 60 : it.off.unit === "sec" ? it.off.value : (it.off.value / 1000) * paceSecForZone(ftp, it.off.zone);
    const offM = it.off.unit === "m" ? it.off.value : (offSec / paceSecForZone(ftp, it.off.zone)) * 1000;
    return { sec: it.reps * (onSec + offSec), m: it.reps * (onM + offM) };
  }
  // teste/simulado — pace ≈ Z3
  const sec = (it.meters / 1000) * paceSecForZone(ftp, "Z3");
  return { sec, m: it.meters };
}

export function computeWorkoutStat(wo: Workout10km, ftp: number): { durationMin: number; volumeM: number } {
  let sec = 0, m = 0;
  for (const sct of wo.sections) {
    for (const it of sct.items) {
      const s2 = itemStats(it, ftp);
      sec += s2.sec; m += s2.m;
    }
  }
  return { durationMin: sec / 60, volumeM: m };
}

// StatsLookup compatível com planilha-5km-zone-distribution
export function makeStatsLookup10km(ftpSecPerKm: number) {
  return (level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string) => {
    const wos = WORKOUTS_10KM[level]?.[phase]?.[weekIdx];
    if (!wos) return null;
    const wo = wos.find((w) => w.code === code);
    if (!wo) return null;
    return computeWorkoutStat(wo, ftpSecPerKm);
  };
}

// Re-exports para compat com a rota
export { formatHm, formatKm, formatKm2, formatHms } from "./planilha-5km-volumes";
