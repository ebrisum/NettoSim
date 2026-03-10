/**
 * AI-ready: scenario comparison, situation notes, advisor matching.
 * Replace function bodies with API calls when integrating real AI.
 */
import { calc, calcMTR } from "./taxEngine.js";

export function generateAIAnalysis(rCurrent, rNew, current, newScen) {
  const diff = rNew.nI - rCurrent.nI;
  const dT = rNew.tT - rCurrent.tT;
  const dE = (rNew.eR - rCurrent.eR) * 100;
  const mN = calcMTR(newScen, newScen.employment || 1000);
  const fmt = (v) => `€${Math.round(Math.abs(v)).toLocaleString("nl-NL")}`;

  const voordelen = [], nadelen = [], inzichten = [];
  let needsAdvisor = false, advisorReason = "";

  if (diff > 500) voordelen.push(`${fmt(diff)} meer netto per jaar`);
  if (diff < -500) nadelen.push(`${fmt(diff)} minder netto per jaar`);
  if (dT > 200) voordelen.push(`${fmt(dT)} meer toeslagen`);
  if (dT < -200) nadelen.push(`${fmt(Math.abs(dT))} minder toeslagen`);
  if (dE < -2) voordelen.push(`Effectief tarief ${Math.abs(dE).toFixed(1)}% lager`);
  if (dE > 2) nadelen.push(`Effectief tarief ${dE.toFixed(1)}% hoger`);

  if (newScen.zzpIncome > 0 && current.zzpIncome === 0 && rNew.zi) {
    voordelen.push(`Ondernemersaftrekken: ${fmt(rNew.zi.za + rNew.zi.sa + rNew.zi.mk)}`);
    nadelen.push(`Zvw-bijdrage ZZP: ${fmt(rNew.zi.zv)}/jaar`);
    nadelen.push("Administratie & boekhouding nodig");
    needsAdvisor = true;
    advisorReason = "Een fiscalist kan uw ZZP-structuur optimaliseren en helpen met de administratieve verplichtingen.";
  }
  if (newScen.zzpIncome > 0 && newScen.employment > 0) {
    voordelen.push("Combinatie loondienst + ZZP: WW-vangnet behouden");
    inzichten.push(`Hybride constructie: Loondienst (€${newScen.employment.toLocaleString("nl-NL")}) + onderneming (€${newScen.zzpIncome.toLocaleString("nl-NL")}). ${newScen.urenOK ? "Urencriterium voldaan → zelfstandigenaftrek van toepassing." : "Zonder urencriterium vervalt zelfstandigenaftrek — overweeg of u 1.225+ uur kunt onderbouwen."}`);
  }
  if (current.isRenter && newScen.hasHome) {
    if (rNew.hy?.nt > 0) voordelen.push(`Hypotheekrenteaftrek: ${fmt(rNew.hy.nt)}/jaar`);
    if (rCurrent.ht > 0) nadelen.push(`Verlies huurtoeslag: ${fmt(rCurrent.ht)}/jaar`);
    needsAdvisor = true;
    advisorReason = "Een hypotheekadviseur kan u helpen met de optimale financiering en belastingvoordelen bij de aankoop.";
    inzichten.push("De overgang van huur naar koop heeft complexe fiscale gevolgen. Naast hypotheekrenteaftrek speelt ook het eigenwoningforfait en mogelijk verlies van huurtoeslag.");
  }
  if (!current.hasKids && newScen.hasKids) {
    if (rNew.kg > 0) voordelen.push(`Kindgebonden budget: ${fmt(rNew.kg)}/jaar`);
    if (rNew.kb > 0) voordelen.push(`Kinderbijslag: ${fmt(rNew.kb)}/jaar`);
  }
  if (diff > 0 && dT < -500) {
    inzichten.push(`Toeslagenval: ${fmt(Math.abs(dT))} minder toeslagen ondanks hoger inkomen. Het werkelijke voordeel is kleiner dan het bruto verschil suggereert.`);
    needsAdvisor = true;
    advisorReason = advisorReason || "Een belastingadviseur kan helpen met het optimaliseren van uw inkomen om de toeslagenval te minimaliseren.";
  }
  if (mN.mtr > 0.55) {
    nadelen.push(`Marginaal tarief ${(mN.mtr * 100).toFixed(0)}% — extra verdienen levert weinig op`);
    inzichten.push(`Hoog marginaal tarief (${(mN.mtr * 100).toFixed(0)}%): Van elke €100 extra houdt u slechts €${Math.round(mN.kept)} over. Overweeg pensioenopbouw of andere aftrekposten.`);
  }
  if (Math.abs(diff) > 5000 || newScen.zzpIncome > 20000 || (newScen.hasHome && !current.hasHome)) {
    needsAdvisor = true;
    advisorReason = advisorReason || "Bij grote financiële veranderingen is professioneel advies aan te raden.";
  }
  if (inzichten.length === 0) inzichten.push("Kleine inkomensverschillen kunnen groot effect hebben door drempels in het belastingstelsel.");

  return { voordelen, nadelen, inzichten, needsAdvisor, advisorReason };
}

export function generateSituationNote(r, scenario) {
  const notes = [];
  if (r.eR > 0.35) notes.push("Uw effectieve belastingdruk is relatief hoog.");
  if (r.tT > 3000) notes.push("U ontvangt significante toeslagen — let op bij inkomensveranderingen.");
  if (scenario.zzpIncome > 0 && !scenario.urenOK) notes.push("Zonder urencriterium mist u de zelfstandigenaftrek.");
  if (r.zt === 0 && !scenario.hasPartner) notes.push("U heeft geen recht meer op zorgtoeslag bij dit inkomen.");
  const mtr = calcMTR(scenario, scenario.employment || 1000);
  if (mtr.mtr > 0.55) notes.push(`Let op: uw marginaal tarief is ${(mtr.mtr * 100).toFixed(0)}%.`);
  return notes;
}

export function getRelevantAdvisors(provincie) {
  const all = [
    { name: "Van der Berg Belastingadviseurs", type: "Belastingadvies", prov: "Noord-Holland", emoji: "🏛️", url: "https://voorbeeld-berg-advies.nl" },
    { name: "FinPlan Amsterdam", type: "Financiële planning", prov: "Noord-Holland", emoji: "📊", url: "https://voorbeeld-finplan.nl" },
    { name: "Kuijpers & Co Accountants", type: "Accountancy", prov: "Utrecht", emoji: "📋", url: "https://voorbeeld-kuijpersco.nl" },
    { name: "Hypotheek Centrum Zuid", type: "Hypotheekadvies", prov: "Brabant", emoji: "🏡", url: "https://voorbeeld-hypocentrumzuid.nl" },
    { name: "De Zaak Administratie", type: "Administratie", prov: "Zuid-Holland", emoji: "💼", url: "https://voorbeeld-dezaakadministratie.nl" },
    { name: "Pension Advies Groep", type: "Pensioenadvies", prov: "Gelderland", emoji: "🎯", url: "https://voorbeeld-pensionadviesgroep.nl" },
    { name: "StartUp Finance", type: "Startup advies", prov: "Zuid-Holland", emoji: "🚀", url: "https://voorbeeld-startupfinance.nl" },
    { name: "Oost-NL Belastingen", type: "Belastingadvies", prov: "Overijssel", emoji: "⚖️", url: "https://voorbeeld-oostnlbelastingen.nl" },
  ];
  return all.filter((a) => a.prov === provincie).slice(0, 3);
}
