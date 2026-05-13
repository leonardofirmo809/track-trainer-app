// Cálculo dinâmico de duração e volume da Planilha 21km a partir do FTP do aluno.
import type { Item, ZoneId } from "./planilha-5km-data";
import type { Workout21km, Phase21 } from "./planilha-21km-data";
import { WORKOUTS_21KM } from "./planilha-21km-data";

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
  const sec = (it.meters / 1000) * paceSecForZone(ftp, "Z3");
  return { sec, m: it.meters };
}

export function computeWorkoutStat(wo: Workout21km, ftp: number): { durationMin: number; volumeM: number } {
  let sec = 0, m = 0;
  for (const sct of wo.sections) {
    for (const it of sct.items) {
      const s2 = itemStats(it, ftp);
      sec += s2.sec; m += s2.m;
    }
  }
  return { durationMin: sec / 60, volumeM: m };
}

// Lookup compatível com computeWorkoutTotals/computePhaseTotals (que tipam phase como 1|2|3|4).
// Aceitamos phase em qualquer número via cast — runtime apenas usa como chave.
export function makeStatsLookup21km(ftpSecPerKm: number) {
  return (level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string) => {
    const wos = WORKOUTS_21KM[level]?.[phase as Phase21]?.[weekIdx];
    if (!wos) return null;
    const wo = wos.find((x) => x.code === code);
    if (!wo) return null;
    return computeWorkoutStat(wo, ftpSecPerKm);
  };
}

export { formatHm, formatKm, formatKm2, formatHms } from "./planilha-5km-volumes";
