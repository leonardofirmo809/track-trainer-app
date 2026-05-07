export type Zone = {
  id: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  level: string;
  pseMin: number;
  pseMax: number;
  phrase: string;
  pctFrom: number;
  pctTo: number | null; // null = sem teto (Z5)
  paceSlowSec: number | null; // pace mais lento (limite "De"). null = sem cap inferior de velocidade
  paceFastSec: number | null; // pace mais rápido (limite "Até"). null em Z5 = "Máx"
  velFrom: number; // km/h, vel no pctFrom (menor velocidade da zona)
  velTo: number | null; // km/h no pctTo, null em Z5 = sem cap
  color: string;
};

export type Teste3kmResult = {
  durationSeconds: number;
  ftpSecondsPerKm: number;
  baseSpeedKmh: number;
  zones: Zone[];
};

const ZONE_DEFS = [
  { id: "Z1", from: 60, to: 76, pseMin: 1, pseMax: 2, level: "Muito Leve / Leve",
    phrase: "Posso correr para sempre nesse ritmo",
    color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" },
  { id: "Z2", from: 76, to: 87, pseMin: 3, pseMax: 4, level: "Moderado / Um pouco Difícil",
    phrase: "Estou me segurando um pouco",
    color: "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40" },
  { id: "Z3", from: 93, to: 100, pseMin: 5, pseMax: 6, level: "Difícil",
    phrase: "Posso manter esse ritmo por 30 a 40 minutos",
    color: "border-amber-400 bg-amber-50 dark:bg-amber-950/40" },
  { id: "Z4", from: 102, to: 115, pseMin: 7, pseMax: 8, level: "Muito Difícil",
    phrase: "Sinto que vou explodir em 10 a 15 minutos",
    color: "border-orange-500 bg-orange-100 dark:bg-orange-900/40" },
  { id: "Z5", from: 115, to: null, pseMin: 9, pseMax: 10, level: "Extremamente Difícil / Máximo",
    phrase: "Posso manter esse ritmo por alguns minutos, talvez três",
    color: "border-red-500 bg-red-100 dark:bg-red-900/40" },
] as const;

export function parseMmss(input: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) throw new Error("Formato inválido. Use mm:ss (ex: 17:42).");
  const min = Number(m[1]);
  const sec = Number(m[2]);
  if (sec >= 60) throw new Error("Segundos devem ser entre 00 e 59.");
  return min * 60 + sec;
}

export function formatMmss(totalSec: number): string {
  if (!isFinite(totalSec) || totalSec < 0) return "—";
  const s = Math.round(totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function calcularTeste3km(durationSeconds: number): Teste3kmResult {
  const tempoMin = durationSeconds / 60;
  const ftpMin = (tempoMin * 1.06) / 3; // pace em min/km
  const ftpSecondsPerKm = ftpMin * 60;
  const baseSpeed = 60 / ftpMin; // km/h, equivale ao 100%

  const paceSecAtPct = (pct: number) => (60 / ((baseSpeed * pct) / 100)) * 60;

  const zones: Zone[] = ZONE_DEFS.map((z) => {
    const velFrom = (baseSpeed * z.from) / 100;
    const velTo = z.to == null ? null : (baseSpeed * z.to) / 100;
    // De = pace mais lento (menor velocidade = pctFrom)
    // Até = pace mais rápido (maior velocidade = pctTo). Em Z5 não há teto: "Máx".
    const paceSlowSec = paceSecAtPct(z.from);
    const paceFastSec = z.to == null ? null : paceSecAtPct(z.to);
    return {
      id: z.id,
      level: z.level,
      pseMin: z.pseMin,
      pseMax: z.pseMax,
      phrase: z.phrase,
      pctFrom: z.from,
      pctTo: z.to,
      paceSlowSec,
      paceFastSec,
      velFrom,
      velTo,
      color: z.color,
    };
  });

  return { durationSeconds, ftpSecondsPerKm, baseSpeedKmh: baseSpeed, zones };
}

export const TEST_MIN_SECONDS = 10 * 60;
export const TEST_MAX_SECONDS = 40 * 60;
