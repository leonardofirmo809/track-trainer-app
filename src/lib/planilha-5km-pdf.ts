import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { formatMmss } from "@/lib/teste-3km";
import type { CoachBranding } from "@/lib/use-coach-branding";
import {
  DAY_LABEL, DAY_FULL, PHASE_LABELS, WORKOUT_TYPES,
  type DayCode, type Workout, type Item, type SectionName, type ZoneId,
} from "@/lib/planilha-5km-data";
import type { DistributionResult } from "@/lib/planilha-5km-distribute";

export type SavedZone = {
  id: ZoneId; level: string; pseMin: number; pseMax: number; phrase: string;
  pctFrom: number; pctTo: number | null;
  paceSlowSec: number | null; paceFastSec: number | null;
  velFrom: number; velTo: number | null;
};

function hexToRgb(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return rgb(0.05, 0.65, 0.91);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

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

const SECTION_LABEL: Record<SectionName, string> = {
  warmup: "Aquecimento", main: "Treino Principal", recovery: "Recuperação", complement: "Complemento",
};

function unitLabel(u: "min" | "sec" | "m"): string {
  return u === "min" ? "min" : u === "sec" ? "seg" : "m";
}

function zoneRangeText(zone: ZoneId, zoneMap: Map<ZoneId, SavedZone>): string {
  const z = zoneMap.get(zone);
  if (!z) return "";
  const pace = `${z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)}–${z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)} min/km`;
  const kmh = `${z.velFrom.toFixed(2).replace(".", ",")}–${z.velTo == null ? "Máx" : z.velTo.toFixed(2).replace(".", ",")} km/h`;
  return `${pace} | ${kmh}`;
}

function itemLines(it: Item, zoneMap: Map<ZoneId, SavedZone>): { main: string; sub: string[] } {
  if (it.kind === "single") {
    return { main: `${it.value}${unitLabel(it.unit)} em ${it.zone}`, sub: [`> ${zoneRangeText(it.zone, zoneMap)}`] };
  }
  if (it.kind === "intervals") {
    return {
      main: `${it.reps}x (${it.on.value}${unitLabel(it.on.unit)} ${it.on.zone} + ${it.off.value}${unitLabel(it.off.unit)} ${it.off.zone})`,
      sub: [`ON ${it.on.zone}: ${zoneRangeText(it.on.zone, zoneMap)}`, `OFF ${it.off.zone}: ${zoneRangeText(it.off.zone, zoneMap)}`],
    };
  }
  return { main: `${it.meters}m — ${it.label} *`, sub: it.note ? [it.note] : [] };
}

export async function generatePlanilha5kmPdf(opts: {
  studentName: string;
  studentLevel: string | null;
  ftpSecondsPerKm: number;
  zones: SavedZone[];
  level: 1 | 2;
  daysPerWeek: number;
  weekDays: DayCode[];
  currentPhase: 1 | 2 | 3 | 4;
  weeks: DistributionResult[];
  branding: CoachBranding;
}): Promise<Blob> {
  const {
    studentName, studentLevel, ftpSecondsPerKm, zones,
    level, daysPerWeek, weekDays, currentPhase, weeks, branding,
  } = opts;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const primary = hexToRgb(branding.primary);
  const secondary = hexToRgb(branding.secondary);
  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.42, 0.45, 0.5);
  const white = rgb(1, 1, 1);
  const lightBg = rgb(0.97, 0.98, 0.99);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 32;
  const contentBottom = 50; // above footer
  const headerH = 70;
  const logo = await tryEmbedLogo(pdf, branding.logoUrl);

  let page!: PDFPage;
  let y = 0;
  let pageNum = 0;

  const drawText = (p: PDFPage, text: string, x: number, yy: number, f: PDFFont, size: number, color: RGB) => {
    p.drawText(text, { x, y: yy, size, font: f, color });
  };
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (f.widthOfTextAtSize(test, size) > maxW) {
        if (cur) lines.push(cur);
        cur = word;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  function newPage() {
    page = pdf.addPage([A4.w, A4.h]);
    pageNum += 1;
    // Header
    page.drawRectangle({ x: 0, y: A4.h - headerH, width: A4.w, height: headerH, color: primary });
    if (logo) {
      const maxH = 44;
      const scale = maxH / logo.height;
      const lw = logo.width * scale;
      page.drawImage(logo, { x: margin, y: A4.h - headerH + (headerH - maxH) / 2, width: lw, height: maxH });
    } else {
      drawText(page, branding.coachName, margin, A4.h - headerH / 2 - 4, bold, 14, white);
    }
    const title = "PLANILHA 5KM";
    drawText(page, title, A4.w - margin - bold.widthOfTextAtSize(title, 16), A4.h - 30, bold, 16, white);
    const sub = `${PHASE_LABELS[currentPhase].title} — ${PHASE_LABELS[currentPhase].subtitle}`;
    drawText(page, sub, A4.w - margin - font.widthOfTextAtSize(sub, 10), A4.h - 48, font, 10, white);
    // Footer
    const footerH = 28;
    page.drawRectangle({ x: 0, y: 0, width: A4.w, height: footerH, color: secondary });
    drawText(page, `Treinador: ${branding.coachName}`, margin, 10, font, 9, white);
    const right = `Aluno: ${studentName}  •  Pág. ${pageNum}`;
    drawText(page, right, A4.w - margin - font.widthOfTextAtSize(right, 9), 10, font, 9, white);
    y = A4.h - headerH - 24;
  }

  function ensure(space: number) {
    if (y - space < contentBottom) newPage();
  }

  newPage();

  // ===== Bloco aluno =====
  drawText(page, studentName, margin, y, bold, 18, ink);
  const today = new Date().toLocaleDateString("pt-BR");
  drawText(page, `Gerado em ${today}  •  Nível ${level} (${level === 1 ? "3x" : "4x"}/sem)  •  ${daysPerWeek} dia(s): ${weekDays.map((d) => DAY_LABEL[d]).join(", ")}`,
    margin, y - 16, font, 10, muted);
  if (studentLevel) drawText(page, `Cadastro: ${studentLevel}`, margin, y - 30, font, 9, muted);

  // FTP card
  const ftpStr = formatMmss(ftpSecondsPerKm);
  const cardW = 170, cardH = 56;
  const cardX = A4.w - margin - cardW;
  const cardY = y - cardH + 12;
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: lightBg, borderColor: primary, borderWidth: 1.5 });
  drawText(page, "FTP", cardX + 12, cardY + cardH - 18, bold, 9, muted);
  drawText(page, ftpStr, cardX + 12, cardY + 18, bold, 22, primary);
  drawText(page, "min/km", cardX + 12 + bold.widthOfTextAtSize(ftpStr, 22) + 6, cardY + 22, font, 10, muted);

  y = cardY - 18;

  // ===== Zonas =====
  ensure(120);
  drawText(page, "Zonas do aluno", margin, y, bold, 12, ink);
  y -= 14;
  const zoneRowH = 18;
  const colsX = [margin + 4, margin + 50, margin + 200, margin + 360];
  page.drawRectangle({ x: margin, y: y - zoneRowH, width: A4.w - margin * 2, height: zoneRowH, color: secondary });
  drawText(page, "Zona", colsX[0], y - 13, bold, 9, white);
  drawText(page, "Nível", colsX[1], y - 13, bold, 9, white);
  drawText(page, "Pace (min/km)", colsX[2], y - 13, bold, 9, white);
  drawText(page, "Velocidade (km/h)", colsX[3], y - 13, bold, 9, white);
  y -= zoneRowH;
  zones.forEach((z, idx) => {
    const fill = idx % 2 === 0 ? lightBg : rgb(1, 1, 1);
    page.drawRectangle({ x: margin, y: y - zoneRowH, width: A4.w - margin * 2, height: zoneRowH, color: fill, borderColor: rgb(0.88, 0.9, 0.92), borderWidth: 0.5 });
    drawText(page, z.id, colsX[0], y - 13, bold, 10, ink);
    drawText(page, z.level, colsX[1], y - 13, font, 9, ink);
    const fast = z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec);
    const slow = z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec);
    drawText(page, `${fast} – ${slow}`, colsX[2], y - 13, font, 10, ink);
    const velTo = z.velTo == null ? "Máx" : z.velTo.toFixed(1);
    drawText(page, `${z.velFrom.toFixed(1)} – ${velTo}`, colsX[3], y - 13, font, 10, ink);
    y -= zoneRowH;
  });
  y -= 10;

  // ===== Semanas =====
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  weeks.forEach((wk, wi) => {
    ensure(40);
    page.drawRectangle({ x: margin, y: y - 22, width: A4.w - margin * 2, height: 22, color: primary });
    drawText(page, `Semana ${wi + 1}`, margin + 8, y - 16, bold, 12, white);
    if (wk.hasConsecutiveIntense) {
      const warn = "! Intensos em dias consecutivos";
      drawText(page, warn, A4.w - margin - 8 - font.widthOfTextAtSize(warn, 9), y - 14, font, 9, white);
    }
    y -= 28;

    wk.assignments.forEach((a) => {
      if (!a.workout) {
        ensure(20);
        drawText(page, `${DAY_FULL[a.day]} — OFF`, margin, y, italic, 10, muted);
        y -= 14;
        return;
      }
      const wo: Workout = a.workout;
      const intense = WORKOUT_TYPES[wo.type].intense;
      // header treino
      ensure(40);
      const titleLine = `${DAY_FULL[a.day]} • ${wo.code} — ${wo.type}  [${wo.zones.join("/")}]`;
      page.drawRectangle({ x: margin, y: y - 18, width: A4.w - margin * 2, height: 18, color: lightBg, borderColor: intense ? rgb(0.85, 0.4, 0.2) : rgb(0.85, 0.86, 0.88), borderWidth: 0.8 });
      drawText(page, titleLine, margin + 6, y - 13, bold, 10, ink);
      y -= 22;

      if (wo.note) {
        ensure(14);
        for (const ln of wrap(`"${wo.note}"`, italic, 9, A4.w - margin * 2 - 12)) {
          ensure(12);
          drawText(page, ln, margin + 8, y, italic, 9, muted);
          y -= 11;
        }
        y -= 2;
      }

      wo.sections.forEach((sct) => {
        ensure(16);
        drawText(page, SECTION_LABEL[sct.name].toUpperCase(), margin + 8, y, bold, 8, muted);
        y -= 11;
        sct.items.forEach((it) => {
          const { main, sub } = itemLines(it, zoneMap);
          ensure(12 + sub.length * 10);
          drawText(page, `• ${main}`, margin + 14, y, font, 10, ink);
          y -= 12;
          sub.forEach((s2) => {
            for (const ln of wrap(s2, font, 8.5, A4.w - margin * 2 - 30)) {
              ensure(10);
              drawText(page, ln, margin + 26, y, font, 8.5, muted);
              y -= 10;
            }
          });
        });
        y -= 4;
      });
      y -= 6;
    });
    y -= 6;
  });

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
