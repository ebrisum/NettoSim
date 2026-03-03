import { jsPDF } from "jspdf";

const MARGIN = 20;
const LINE = 6;
const TITLE = 16;
const HEAD = 12;
const BODY = 10;

function addText(doc, text, y, opts = {}) {
  const { font = "helvetica", size = BODY, x = MARGIN } = opts;
  doc.setFont(font, "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.width - 2 * MARGIN);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += LINE;
  });
  return y;
}

function addSpace(y, n = 1) {
  return y + LINE * n;
}

export function exportSummaryPdf({ cur, nw, rC, rN, ai, totalTax, diff }) {
  const doc = new jsPDF();
  let y = MARGIN;

  doc.setFontSize(TITLE);
  doc.setFont("helvetica", "bold");
  doc.text("NettoSim — Samenvatting vergelijking", MARGIN, y);
  y = addSpace(y, 2);

  doc.setFontSize(BODY);
  doc.setFont("helvetica", "normal");
  doc.text(`Gegenereerd op ${new Date().toLocaleDateString("nl-NL")} om ${new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.`, MARGIN, y);
  y = addSpace(y, 2);

  // Huidige situatie
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("1. Huidige situatie", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  y = addText(doc, `Bruto inkomen: €${Math.round(rC.gT).toLocaleString("nl-NL")}  |  Netto per maand: €${Math.round(rC.mo).toLocaleString("nl-NL")}  |  Totale belasting: €${Math.round(totalTax(rC)).toLocaleString("nl-NL")}  |  Toeslagen: €${Math.round(rC.tT).toLocaleString("nl-NL")}  |  Effectief tarief: ${(rC.eR * 100).toFixed(1)}%`, y);
  y = addSpace(y, 2);

  // Nieuwe situatie
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("2. Nieuwe situatie", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  y = addText(doc, `Bruto inkomen: €${Math.round(rN.gT).toLocaleString("nl-NL")}  |  Netto per maand: €${Math.round(rN.mo).toLocaleString("nl-NL")}  |  Totale belasting: €${Math.round(totalTax(rN)).toLocaleString("nl-NL")}  |  Toeslagen: €${Math.round(rN.tT).toLocaleString("nl-NL")}  |  Effectief tarief: ${(rN.eR * 100).toFixed(1)}%`, y);
  y = addSpace(y, 2);

  // Veranderingen
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("3. Veranderingen (nieuw − huidig)", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  const diffLabel = diff >= 0 ? "Meer netto per jaar" : "Minder netto per jaar";
  doc.text(`${diffLabel}: ${diff >= 0 ? "+" : "-"}€${Math.round(Math.abs(diff)).toLocaleString("nl-NL")} (per maand: ${diff >= 0 ? "+" : "-"}€${Math.round(Math.abs(diff / 12)).toLocaleString("nl-NL")})`, MARGIN, y);
  y += LINE;
  doc.text(`Belasting: €${Math.round(totalTax(rN) - totalTax(rC)).toLocaleString("nl-NL")}  |  Kortingen: €${Math.round(rN.tC - rC.tC).toLocaleString("nl-NL")}  |  Toeslagen: €${Math.round(rN.tT - rC.tT).toLocaleString("nl-NL")}`, MARGIN, y);
  y = addSpace(y, 2);

  // Voordelen
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("4. Voordelen", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  if (ai.voordelen && ai.voordelen.length > 0) {
    ai.voordelen.forEach((v) => {
      y = addText(doc, `• ${v}`, y, { x: MARGIN + 4 });
    });
  } else {
    y = addText(doc, "Geen significante voordelen gevonden.", y);
  }
  y = addSpace(y, 2);

  // Nadelen / risico's
  if (y > 240) { doc.addPage(); y = MARGIN; }
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("5. Nadelen & risico's", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  if (ai.nadelen && ai.nadelen.length > 0) {
    ai.nadelen.forEach((n) => {
      y = addText(doc, `• ${n}`, y, { x: MARGIN + 4 });
    });
  } else {
    y = addText(doc, "Geen significante nadelen gevonden.", y);
  }
  y = addSpace(y, 2);

  // Inzichten
  if (y > 250) { doc.addPage(); y = MARGIN; }
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("6. Inzichten", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY);
  if (ai.inzichten && ai.inzichten.length > 0) {
    ai.inzichten.forEach((i) => {
      y = addText(doc, i, y, { x: MARGIN });
    });
  } else {
    y = addText(doc, "—", y);
  }
  y = addSpace(y, 2);

  // Aandachtspunten / bespreekpunten
  if (ai.needsAdvisor && ai.advisorReason) {
    if (y > 255) { doc.addPage(); y = MARGIN; }
    doc.setFontSize(HEAD);
    doc.setFont("helvetica", "bold");
    doc.text("7. Aandachtspunten / bespreekpunten", MARGIN, y);
    y = addSpace(y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY);
    y = addText(doc, ai.advisorReason, y);
    y = addSpace(y, 2);
  }

  // Disclaimer
  if (y > 260) { doc.addPage(); y = MARGIN; }
  doc.setFontSize(HEAD);
  doc.setFont("helvetica", "bold");
  doc.text("Disclaimer", MARGIN, y);
  y = addSpace(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y = addText(doc, "Vereenvoudigd rekenmodel voor educatieve doeleinden. Gebruik toeslagen.nl/proefberekening voor exacte bedragen. Raadpleeg een belastingadviseur. Geen rechten aan te ontlenen. Bron: Belastingdienst 2025.", y);

  doc.save(`NettoSim-samenvatting-${new Date().toISOString().slice(0, 10)}.pdf`);
}
