// Renderização compartilhada para os PDFs de planilha (5/10/21/42km).
// Layout baseado no modelo "Planilha_5km_Leonardo_v2" — header colorido com a
// cor primária do treinador, FTP no canto, tabela de zonas com badges
// coloridas, semanas em faixas, seções com label colorido, itens em duas
// colunas (descrição à esquerda, range à direita) e barra vertical de
// intensidade na lateral direita do bloco.

import {
  PDFDocument, StandardFonts, rgb,
  type PDFFont, type PDFPage, type RGB,
} from "pdf-lib";
import { formatMmss } from "@/lib/teste-3km";
import type { CoachBranding } from "@/lib/use-coach-branding";
import type { DistributionResult } from "@/lib/planilha-5km-distribute";

// ===== Tipos genéricos =====
// Compatíveis com Workout/Item/Section de 5/10/21/42km — todas usam a mesma
// shape estrutural (kind="single"|"intervals"|"test").

export type Unit = "min" | "sec" | "m";
export type AnyZoneId = string; // "Z1".."Z5"
export type AnySectionName = "warmup" | "main" | "recovery" | "complement";

export type AnySingle = { kind: "single"; value: number; unit: Unit; zone: AnyZoneId };
export type AnyIntervals = { kind: "intervals"; reps: number; on: AnySingle; off: AnySingle };
export type AnyTest = { kind: "test"; meters: number; label: string; note?: string };
export type AnyItem = AnySingle | AnyIntervals | AnyTest;

export type AnySection = { name: AnySectionName; items: AnyItem[] };
export type AnyWorkout = {
  code: string;
  type: string;
  zones: AnyZoneId[];
  sections: AnySection[];
  note?: string;
};

export type SavedZone = {
  id: AnyZoneId; level: string; pseMin: number; pseMax: number; phrase: string;
  pctFrom: number; pctTo: number | null;
  paceSlowSec: number | null; paceFastSec: number | null;
  velFrom: number; velTo: number | null;
};

// ===== Paleta =====

function hexToRgb(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return rgb(0.05, 0.65, 0.91);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

// Tinge a cor do header escurecendo levemente (para contraste do FTP).
function darken(c: RGB, amount = 0.12): RGB {
  return rgb(
    Math.max(0, c.red - amount),
    Math.max(0, c.green - amount),
    Math.max(0, c.blue - amount),
  );
}

type ZonePaint = { bg: RGB; fg: RGB; bar: RGB };

// Paleta fisiológica universal (não muda por treinador).
export const ZONE_PALETTE: Record<string, ZonePaint> = {
  Z1: { bg: rgb(0.86, 0.95, 0.88), fg: rgb(0.10, 0.45, 0.27), bar: rgb(0.16, 0.65, 0.39) }, // verde
  Z2: { bg: rgb(0.85, 0.92, 0.98), fg: rgb(0.10, 0.36, 0.62), bar: rgb(0.20, 0.51, 0.85) }, // azul
  Z3: { bg: rgb(0.99, 0.91, 0.79), fg: rgb(0.62, 0.36, 0.10), bar: rgb(0.92, 0.59, 0.18) }, // laranja
  Z4: { bg: rgb(0.99, 0.86, 0.86), fg: rgb(0.62, 0.15, 0.15), bar: rgb(0.85, 0.27, 0.27) }, // vermelho
  Z5: { bg: rgb(0.92, 0.87, 0.97), fg: rgb(0.42, 0.20, 0.62), bar: rgb(0.62, 0.36, 0.85) }, // roxo
};

function zonePaint(z: AnyZoneId): ZonePaint {
  return ZONE_PALETTE[z] ?? ZONE_PALETTE["Z1"]!;
}

// Cor do label de cada seção.
const SECTION_PAINT: Record<AnySectionName, RGB> = {
  warmup:     rgb(0.20, 0.55, 0.35), // verde aquecido
  main:       rgb(0.10, 0.36, 0.62), // azul
  recovery:   rgb(0.45, 0.45, 0.50), // cinza
  complement: rgb(0.42, 0.20, 0.62), // roxo
};

const SECTION_LABEL: Record<AnySectionName, string> = {
  warmup: "AQUECIMENTO",
  main: "TREINO PRINCIPAL",
  recovery: "RECUPERAÇÃO",
  complement: "COMPLEMENTO",
};

// Barra de intensidade do treino (verde/amarelo/vermelho).
// Heurística: zonas máximas presentes definem a cor.
function intensityBar(workout: AnyWorkout, intense: boolean): RGB {
  const zs = workout.zones;
  if (zs.includes("Z5") || zs.includes("Z4") || intense) return rgb(0.85, 0.27, 0.27); // vermelho
  if (zs.includes("Z3")) return rgb(0.92, 0.71, 0.18); // amarelo
  return rgb(0.16, 0.65, 0.39); // verde
}

// ===== Logo =====

async function tryEmbedLogo(pdf: PDFDocument, url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return await pdf.embedPng(buf);
    return await pdf.embedJpg(buf);
  } catch { return null; }
}

// ===== Helpers de texto =====

function unitLabel(u: Unit): string {
  return u === "min" ? "min" : u === "sec" ? "seg" : "m";
}

function zoneRangeText(zone: AnyZoneId, zoneMap: Map<AnyZoneId, SavedZone>): string {
  const z = zoneMap.get(zone);
  if (!z) return "";
  const fast = z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec);
  const slow = z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec);
  const velFrom = z.velFrom.toFixed(2).replace(".", ",");
  const velTo = z.velTo == null ? "Máx" : z.velTo.toFixed(2).replace(".", ",");
  return `${fast}–${slow} min/km  |  ${velFrom}–${velTo} km/h`;
}

// Descrição do item à esquerda (sem a faixa, que vai do lado direito).
// Para intervalos, retornamos as duas zonas (on/off) para renderizar uma badge
// colorida por bloco, no padrão da prescrição (ex.: "6× (1min [Z4] + 1min [Z1])").
function itemLeft(it: AnyItem): {
  text: string;
  zone: AnyZoneId | null;
  intervals?: {
    reps: number;
    on: { text: string; zone: AnyZoneId };
    off: { text: string; zone: AnyZoneId };
  };
} {
  if (it.kind === "single") {
    return { text: `${it.value}${unitLabel(it.unit)}`, zone: it.zone };
  }
  if (it.kind === "intervals") {
    return {
      text: "",
      zone: null,
      intervals: {
        reps: it.reps,
        on: { text: `${it.on.value}${unitLabel(it.on.unit)}`, zone: it.on.zone },
        off: { text: `${it.off.value}${unitLabel(it.off.unit)}`, zone: it.off.zone },
      },
    };
  }
  return { text: `${it.meters}m — ${it.label}`, zone: null };
}

function itemRight(it: AnyItem, zoneMap: Map<AnyZoneId, SavedZone>): string {
  if (it.kind === "single") return zoneRangeText(it.zone, zoneMap);
  if (it.kind === "intervals") return `${it.on.zone}: ${zoneRangeText(it.on.zone, zoneMap)}`;
  return it.note ?? "";
}

// ===== Renderer principal =====

export type RenderPlanilhaOpts<W extends AnyWorkout> = {
  distanceLabel: string; // "5KM", "10KM", "21KM", "42KM"
  phaseTitle: string;    // "Fase 1"
  phaseSubtitle: string; // "Preparação Geral"
  studentName: string;
  studentLevel: string | null;
  ftpSecondsPerKm: number;
  zones: SavedZone[];
  level: 1 | 2;
  daysPerWeek: number;
  weekDays: { full: string; short: string }[]; // pré-mapeado
  weeks: DistributionResult<W>[];
  branding: CoachBranding;
  /** Nome completo do dia para cada DayCode (TER → "TERÇA-FEIRA"). */
  dayFull: Record<string, string>;
  /** intense flag por tipo de treino. */
  isIntense: (workoutType: string) => boolean;
  /** Data exibida no header como "Gerado em ...". Default: hoje. */
  generatedAt?: string | Date | null;
};

export async function renderPlanilhaPdf<W extends AnyWorkout>(
  opts: RenderPlanilhaOpts<W>,
): Promise<Blob> {
  const {
    distanceLabel, phaseTitle, phaseSubtitle,
    studentName, studentLevel, ftpSecondsPerKm, zones,
    level, daysPerWeek, weekDays, weeks, branding, dayFull, isIntense,
    generatedAt,
  } = opts;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const primary = hexToRgb(branding.primary);
  const primaryDark = darken(primary, 0.18);
  const ink = rgb(0.10, 0.10, 0.12);
  const muted = rgb(0.45, 0.48, 0.52);
  const mutedSoft = rgb(0.62, 0.65, 0.70);
  const white = rgb(1, 1, 1);
  const lightBg = rgb(0.97, 0.98, 0.99);
  const dayPill = rgb(0.93, 0.96, 0.94);
  const ruleColor = rgb(0.90, 0.92, 0.94);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 36;
  const headerH = 92;
  const footerH = 28;
  const contentW = A4.w - margin * 2;
  const logo = await tryEmbedLogo(pdf, branding.logoUrl);

  let page!: PDFPage;
  let y = 0;
  let pageNum = 0;

  const drawText = (p: PDFPage, text: string, x: number, yy: number, f: PDFFont, size: number, color: RGB) => {
    p.drawText(text, { x, y: yy, size, font: f, color });
  };

  const truncate = (text: string, f: PDFFont, size: number, maxW: number): string => {
    if (f.widthOfTextAtSize(text, size) <= maxW) return text;
    const ell = "…";
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (f.widthOfTextAtSize(text.slice(0, mid) + ell, size) <= maxW) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo) + ell;
  };

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (f.widthOfTextAtSize(test, size) > maxW) {
        if (cur) lines.push(cur);
        if (f.widthOfTextAtSize(word, size) > maxW) {
          let buf = "";
          for (const ch of word) {
            if (f.widthOfTextAtSize(buf + ch, size) > maxW) {
              if (buf) lines.push(buf);
              buf = ch;
            } else buf += ch;
          }
          cur = buf;
        } else cur = word;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const generatedDate = generatedAt ? new Date(generatedAt) : new Date();
  const today = (isNaN(generatedDate.getTime()) ? new Date() : generatedDate).toLocaleDateString("pt-BR");
  const infoLine =
    `Início em ${today}  •  Nível ${level} (${level === 1 ? "3x" : "4x"}/sem)  •  ` +
    `Dias: ${weekDays.map((d) => d.short).join(", ")}`;

  function drawHeader() {
    // faixa colorida
    page.drawRectangle({ x: 0, y: A4.h - headerH, width: A4.w, height: headerH, color: primary });

    // FTP no canto direito (dentro do header, sem caixa separada)
    const ftpStr = formatMmss(ftpSecondsPerKm);
    const ftpSize = 30;
    const ftpW = bold.widthOfTextAtSize(ftpStr, ftpSize);
    const ftpRight = A4.w - margin;
    drawText(page, ftpStr, ftpRight - ftpW, A4.h - 44, bold, ftpSize, white);
    const ftpLabel = "FTP min/km";
    const ftpLabelW = font.widthOfTextAtSize(ftpLabel, 9);
    drawText(page, ftpLabel, ftpRight - ftpLabelW, A4.h - 60, font, 9, white);

    // Logo OU nome do treinador (uppercase) à esquerda
    let leftX = margin;
    if (logo) {
      const maxH = 36;
      const scale = maxH / logo.height;
      const lw = logo.width * scale;
      page.drawImage(logo, { x: leftX, y: A4.h - 28 - maxH, width: lw, height: maxH });
    }

    // Nome do aluno em destaque
    const nameMaxW = ftpRight - ftpW - leftX - 24;
    const nameStr = truncate(studentName.toUpperCase(), bold, 22, nameMaxW);
    drawText(page, nameStr, leftX, A4.h - 38, bold, 22, white);

    // Subtítulo: planilha + fase
    const sub1 = `Planilha ${distanceLabel.toLowerCase()}  •  ${phaseTitle} — ${phaseSubtitle}`;
    drawText(page, truncate(sub1, font, 10, nameMaxW), leftX, A4.h - 56, font, 10, white);

    // Linha de info
    drawText(page, truncate(infoLine, font, 9.5, nameMaxW), leftX, A4.h - 72, font, 9.5, white);

    y = A4.h - headerH - 22;
  }

  function drawFooter() {
    const txt = `Página ${pageNum}`;
    const w = font.widthOfTextAtSize(txt, 9);
    drawText(page, txt, (A4.w - w) / 2, 14, font, 9, mutedSoft);
  }

  function newPage() {
    if (page) drawFooter();
    page = pdf.addPage([A4.w, A4.h]);
    pageNum += 1;
    drawHeader();
  }

  function ensure(space: number) {
    if (y - space < footerH + 8) newPage();
  }

  newPage();

  // ===== Tabela de zonas =====
  ensure(140);
  drawText(page, "ZONAS DE TREINAMENTO", margin, y, bold, 10.5, ink);
  y -= 14;

  const rowH = 24;
  const colsX = {
    zona: margin,
    nivel: margin + 70,
    pace: margin + 280,
    vel: margin + 430,
  };
  const tableW = contentW;

  // header da tabela
  page.drawRectangle({ x: margin, y: y - rowH, width: tableW, height: rowH, color: primaryDark });
  drawText(page, "ZONA",              colsX.zona  + 12, y - 16, bold, 9, white);
  drawText(page, "NÍVEL",             colsX.nivel + 0,  y - 16, bold, 9, white);
  drawText(page, "PACE (min/km)",     colsX.pace  + 0,  y - 16, bold, 9, white);
  drawText(page, "VELOCIDADE (km/h)", colsX.vel   + 0,  y - 16, bold, 9, white);
  y -= rowH;

  zones.forEach((z, idx) => {
    const stripe = idx % 2 === 0 ? lightBg : white;
    page.drawRectangle({
      x: margin, y: y - rowH, width: tableW, height: rowH,
      color: stripe, borderColor: ruleColor, borderWidth: 0.5,
    });

    // badge da zona (canto esquerdo)
    const paint = zonePaint(z.id);
    const badgeW = 40, badgeH = rowH - 6;
    const badgeX = colsX.zona + 8;
    const badgeY = y - rowH + 3;
    page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: paint.bg });
    const zoneTextW = bold.widthOfTextAtSize(z.id, 11);
    drawText(page, z.id, badgeX + (badgeW - zoneTextW) / 2, badgeY + (badgeH - 11) / 2 + 1, bold, 11, paint.fg);

    drawText(page, truncate(z.level, font, 9.5, colsX.pace - colsX.nivel - 10),
      colsX.nivel, y - 16, font, 9.5, ink);

    const fast = z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec);
    const slow = z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec);
    drawText(page, `${fast} – ${slow}`, colsX.pace, y - 16, bold, 10.5, ink);

    const velTo = z.velTo == null ? "Máx" : z.velTo.toFixed(1);
    drawText(page, `${z.velFrom.toFixed(1)} – ${velTo}`, colsX.vel, y - 16, font, 10.5, ink);

    y -= rowH;
  });
  y -= 16;

  // ===== Semanas =====
  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  function estimateWorkoutHeight(wo: AnyWorkout): number {
    let h = 26; // header do dia
    if (wo.note) h += 14;
    for (const sct of wo.sections) {
      h += 18; // section label
      for (const it of sct.items) {
        h += 16; // item line
        const right = itemRight(it, zoneMap);
        if (right) h += 0; // item right vai na mesma linha
      }
      h += 6;
    }
    return h + 12;
  }

  weeks.forEach((wk, wi) => {
    ensure(46 + 80);
    // Faixa "SEMANA N"
    page.drawRectangle({ x: margin, y: y - 24, width: contentW, height: 24, color: primary });
    drawText(page, `SEMANA ${wi + 1}`, margin + 12, y - 17, bold, 13, white);
    y -= 36;

    wk.assignments.forEach((a) => {
      if (!a.workout) {
        ensure(20);
        drawText(page, `${dayFull[a.day]} — DESCANSO`, margin, y, italic, 10, mutedSoft);
        y -= 18;
        return;
      }
      const wo = a.workout as AnyWorkout;
      const intense = isIntense(wo.type);
      const barColor = intensityBar(wo, intense);

      ensure(estimateWorkoutHeight(wo));

      // ----- Header do dia (pill) -----
      const dayPillH = 22;
      page.drawRectangle({
        x: margin, y: y - dayPillH, width: contentW, height: dayPillH,
        color: dayPill,
      });
      const rawDay = dayFull[a.day] ?? a.day;
      const dayLabel = /^(SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA)$/i.test(rawDay)
        ? `${rawDay}-FEIRA`
        : rawDay;
      drawText(page, dayLabel, margin + 12, y - 15, bold, 10.5, ink);

      // título do treino
      const dayLabelW = bold.widthOfTextAtSize(dayLabel, 10.5);
      const titleX = margin + 12 + dayLabelW + 16;
      const zoneTagText = ` [${wo.zones.join("/")}]`;
      const titleMain = `${wo.code} — ${wo.type}`;
      const titleAvail = contentW - (titleX - margin) - 16;
      const titleStr = truncate(titleMain, bold, 10.5, titleAvail - bold.widthOfTextAtSize(zoneTagText, 9.5));
      drawText(page, titleStr, titleX, y - 15, bold, 10.5, ink);
      const titleW = bold.widthOfTextAtSize(titleStr, 10.5);
      drawText(page, zoneTagText, titleX + titleW, y - 15, font, 9.5, mutedSoft);

      y -= dayPillH + 4;

      // bloco de seções (com barra de intensidade à direita)
      const blockTop = y;

      if (wo.note) {
        const noteLines = wrap(`"${wo.note}"`, italic, 9, contentW - 24);
        for (const ln of noteLines) {
          ensure(13);
          drawText(page, ln, margin + 8, y, italic, 9, muted);
          y -= 12;
        }
        y -= 2;
      }

      wo.sections.forEach((sct) => {
        ensure(18);
        const sectColor = SECTION_PAINT[sct.name] ?? muted;
        drawText(page, SECTION_LABEL[sct.name], margin + 8, y - 2, bold, 8.5, sectColor);
        y -= 14;

        sct.items.forEach((it) => {
          ensure(16);
          const left = itemLeft(it);
          const right = itemRight(it, zoneMap);

          // Lado esquerdo: "5min [Z1]" com badge da zona inline
          const leftSize = 10;
          let lx = margin + 14;
          drawText(page, left.text, lx, y, font, leftSize, ink);
          lx += font.widthOfTextAtSize(left.text, leftSize) + 6;

          if (left.zone) {
            const paint = zonePaint(left.zone);
            const tag = `[${left.zone}]`;
            const tagW = bold.widthOfTextAtSize(tag, 9);
            const padX = 4, padY = 2;
            page.drawRectangle({
              x: lx - padX, y: y - padY, width: tagW + padX * 2, height: 9 + padY * 2,
              color: paint.bg,
            });
            drawText(page, tag, lx, y, bold, 9, paint.fg);
            lx += tagW + padX * 2 + 4;
          }

          // Lado direito: range
          if (right) {
            const rightSize = 8.5;
            const rightMaxW = contentW - 200;
            const rightStr = truncate(right, italic, rightSize, rightMaxW);
            const rw = italic.widthOfTextAtSize(rightStr, rightSize);
            const rx = margin + contentW - 14 - rw;
            drawText(page, rightStr, rx, y, italic, rightSize, mutedSoft);
          }

          y -= 14;
        });
        y -= 4;
      });

      // Barra vertical de intensidade
      const barH = blockTop - y - 2;
      if (barH > 4) {
        page.drawRectangle({
          x: margin + contentW - 4, y: y + 4, width: 3, height: barH - 4,
          color: barColor,
        });
      }

      // separador
      page.drawLine({
        start: { x: margin + 8, y: y - 2 },
        end: { x: margin + contentW - 8, y: y - 2 },
        thickness: 0.5, color: ruleColor,
      });
      y -= 10;
    });
    y -= 8;
  });

  drawFooter();

  // discreta marca de cadastro do aluno (rodapé esquerdo)
  if (studentLevel) {
    const tag = `Cadastro: ${studentLevel}`;
    drawText(page, tag, margin, 14, font, 8, mutedSoft);
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
