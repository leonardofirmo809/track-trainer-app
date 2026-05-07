import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { formatMmss, type Teste3kmResult } from "@/lib/teste-3km";
import type { CoachBranding } from "@/lib/use-coach-branding";

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
  } catch {
    return null;
  }
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: RGB) {
  page.drawText(text, { x, y, size, font, color });
}

export async function generateTeste3kmPdf(opts: {
  result: Teste3kmResult;
  studentName: string | null;
  testDate: string; // ISO yyyy-mm-dd
  branding: CoachBranding;
}): Promise<Blob> {
  const { result, studentName, testDate, branding } = opts;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const primary = hexToRgb(branding.primary);
  const secondary = hexToRgb(branding.secondary);
  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.42, 0.45, 0.5);
  const white = rgb(1, 1, 1);
  const lightBg = rgb(0.97, 0.98, 0.99);

  // Header band
  const headerH = 80;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: primary });

  const logo = await tryEmbedLogo(pdf, branding.logoUrl);
  if (logo) {
    const maxH = 50;
    const scale = maxH / logo.height;
    const w = logo.width * scale;
    page.drawImage(logo, { x: 32, y: height - headerH + (headerH - maxH) / 2, width: w, height: maxH });
  } else {
    drawText(page, branding.coachName, 32, height - headerH / 2 - 4, bold, 16, white);
  }
  drawText(page, "TESTE DE 3KM", width - 32 - bold.widthOfTextAtSize("TESTE DE 3KM", 18), height - 38, bold, 18, white);
  const sub = "Zonas de Treinamento";
  drawText(page, sub, width - 32 - font.widthOfTextAtSize(sub, 11), height - 56, font, 11, white);

  // Student / FTP block
  let y = height - headerH - 32;
  const dateBr = new Date(testDate + "T00:00:00").toLocaleDateString("pt-BR");
  drawText(page, studentName || "Teste avulso", 32, y, bold, 18, ink);
  drawText(page, `Data: ${dateBr}  •  Tempo do teste: ${formatMmss(result.durationSeconds)}`, 32, y - 16, font, 10, muted);

  // FTP card right
  const ftpStr = formatMmss(result.ftpSecondsPerKm);
  const cardW = 170, cardH = 56;
  const cardX = width - 32 - cardW;
  const cardY = y - cardH + 12;
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: lightBg, borderColor: primary, borderWidth: 1.5 });
  drawText(page, "FTP", cardX + 12, cardY + cardH - 18, bold, 9, muted);
  drawText(page, ftpStr, cardX + 12, cardY + 18, bold, 22, primary);
  drawText(page, "min/km", cardX + 12 + bold.widthOfTextAtSize(ftpStr, 22) + 6, cardY + 22, font, 10, muted);

  y = cardY - 24;

  // Zones table
  const cols = [
    { key: "id", label: "Zona", w: 42 },
    { key: "level", label: "Nível", w: 110 },
    { key: "pse", label: "PSE", w: 38 },
    { key: "pace", label: "Pace (min/km)", w: 95 },
    { key: "esteira", label: "Esteira (km/h)", w: 90 },
    { key: "phrase", label: "Sensação (PSE)", w: 0 }, // remaining
  ];
  const tableX = 32;
  const tableW = width - 64;
  const usedW = cols.reduce((a, c) => a + c.w, 0);
  cols[cols.length - 1].w = tableW - usedW;

  // Header row
  const headerRowH = 22;
  page.drawRectangle({ x: tableX, y: y - headerRowH, width: tableW, height: headerRowH, color: secondary });
  let cx = tableX;
  for (const c of cols) {
    drawText(page, c.label, cx + 6, y - 15, bold, 9, white);
    cx += c.w;
  }
  y -= headerRowH;

  // Wrap text helper
  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxW) {
        if (cur) lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const zoneFill = [
    rgb(0.93, 0.98, 0.95),
    rgb(0.86, 0.96, 0.89),
    rgb(0.99, 0.96, 0.86),
    rgb(0.99, 0.91, 0.83),
    rgb(0.99, 0.87, 0.86),
  ];

  result.zones.forEach((z, idx) => {
    const phraseLines = wrap(`"${z.phrase}"`, italic, 8.5, cols[5].w - 12);
    const rowH = Math.max(40, 14 + phraseLines.length * 11);
    page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: zoneFill[idx], borderColor: rgb(0.85, 0.86, 0.88), borderWidth: 0.5 });
    let x = tableX;
    // Zona
    drawText(page, z.id, x + 8, y - 16, bold, 14, ink);
    x += cols[0].w;
    // Nível
    const nivelLines = wrap(z.level, font, 9, cols[1].w - 10);
    nivelLines.slice(0, 2).forEach((ln, i) => drawText(page, ln, x + 6, y - 14 - i * 11, font, 9, ink));
    x += cols[1].w;
    // PSE
    drawText(page, `${z.pseMin}–${z.pseMax}`, x + 6, y - 16, bold, 10, ink);
    x += cols[2].w;
    // Pace De → Até
    const fast = z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec);
    const slow = z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec);
    drawText(page, "De", x + 6, y - 13, font, 7.5, muted);
    drawText(page, fast, x + 22, y - 14, bold, 10, ink);
    drawText(page, "Até", x + 6, y - 28, font, 7.5, muted);
    drawText(page, slow, x + 22, y - 29, font, 10, ink);
    x += cols[3].w;
    // Esteira De → Até
    const velTo = z.velTo == null ? "Máx" : z.velTo.toFixed(1);
    const velFrom = z.velFrom.toFixed(1);
    drawText(page, "De", x + 6, y - 13, font, 7.5, muted);
    drawText(page, velTo, x + 22, y - 14, bold, 10, ink);
    drawText(page, "Até", x + 6, y - 28, font, 7.5, muted);
    drawText(page, velFrom, x + 22, y - 29, font, 10, ink);
    x += cols[4].w;
    // Phrase
    phraseLines.forEach((ln, i) => drawText(page, ln, x + 6, y - 14 - i * 11, italic, 8.5, ink));
    y -= rowH;
  });

  // Legend / explanation
  y -= 16;
  drawText(page, "Como usar as zonas", 32, y, bold, 11, ink);
  y -= 14;
  const explain = "PSE = Percepção Subjetiva de Esforço (1 a 10). Cada zona indica a faixa de pace e velocidade na esteira para o aluno treinar nessa intensidade. A FTP corresponde ao ritmo de limiar funcional estimado a partir do teste de 3KM.";
  for (const ln of wrap(explain, font, 9, width - 64)) {
    drawText(page, ln, 32, y, font, 9, muted);
    y -= 12;
  }

  // Footer
  const footerH = 32;
  page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: secondary });
  const footerLeft = `Treinador: ${branding.coachName}`;
  drawText(page, footerLeft, 32, 12, font, 9, white);
  const gen = `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
  drawText(page, gen, width - 32 - font.widthOfTextAtSize(gen, 9), 12, font, 9, white);

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
