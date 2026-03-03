import { useState, useMemo, useRef, useEffect } from "react";
import { buildInsights } from "./lib/insights";
import InsightsPanel from "./components/InsightsPanel";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ResultsReportPDF from "./ResultsReportPDF";
import { buildPdfData } from "./buildPdfData";

// ═══════════════════════════════════════════════════════════
// TAX ENGINE (2025) — Compact
// ═══════════════════════════════════════════════════════════
const B1=38441,B2=76817,R1=.3582,R2=.3748,R3=.495,R1A=.1907,ZR=.0526,ZM=75864;
function cT(g,a){if(g<=0)return 0;let t=0,r=a?R1A:R1;t+=Math.min(g,B1)*r;if(g>B1)t+=(Math.min(g,B2)-B1)*R2;if(g>B2)t+=(g-B2)*R3;return t;}
function cAK(i,a){if(i<=0)return 0;let k=0;if(i<=12169)k=i*.08052;else if(i<=26288)k=980+(i-12169)*.30028;else if(i<=43071)k=5599;else if(i<=129078)k=Math.max(0,5599-(i-43071)*.0651);if(a)k*=.5326;return k;}
function cAHK(i,a){if(i<=0)return 0;let h=i<=28406?3068:Math.max(0,3068-(i-28406)*.06337);if(a)h*=.5326;return h;}
function cIACK(i,e){return(!e||i<6145)?0:Math.min(2986,(i-6145)*.1145);}
function cOK(i,a){if(!a)return 0;return i<=44770?2035:Math.max(0,2035-(i-44770)*.15);}
function cAOK(a,s){return(a&&s)?531:0;}
function cZT(i,p){const m=p?3010:1573,l=p?50206:39719;if(i>=l)return 0;if(i<=28406)return m;return Math.max(0,m*(1-(i-28406)/(l-28406)));}
function cHT(i,p,r){if(r<=0||r>900)return 0;const m=p?45000:34000;if(i>=m)return 0;const b=p?280:240,s=Math.max(0,r-b)*12*.72;if(i<=19000)return s;return Math.max(0,s-(i-19000)*(p?.22:.27));}
function cKGB(i,p,n,s){if(n<=0)return 0;const b=n*2511,a=(s&&!p)?3389:0,t=b+a,st=p?37545:28406;if(i<=st)return t;return Math.max(0,t-(i-st)*.071);}
function cKOT(i,p,n,u,h){if(n<=0||h<=0)return 0;const uu=Math.min(u,10.25),hh=Math.min(h,230);let p1=.96;if(i>29000)p1=Math.max(.337,.96-(i-29000)*.0000048);if(i>130000)p1=.337;let p2=Math.min(.95,p1+.1);return uu*hh*12*p1+(n>1?(n-1)*uu*hh*12*p2:0);}
function cKB(n){return n*269.76*4;}
function cZZP(w,s,u){let t=w,za=0,sa=0,mk=0;if(u){za=Math.min(2470,t);t-=za;if(s){sa=Math.min(2123,t);t-=sa;}}mk=t*.127;t-=mk;t=Math.max(0,t);return{tp:t,za,sa,mk,zv:Math.min(w,ZM)*ZR};}
function cHYP(h,r,w,i){if(h<=0)return{af:0,ew:0,nt:0,jr:0,eb:0};const j=h*(r/100),t=Math.min(.3748,i>B2?.3748:i>B1?R2:R1),a=j*t,eb=w*.0035,et=eb*t;return{af:a,ew:et,nt:a-et,jr:j,eb};}
function cDUO(i,p,d){if(d<=0)return 0;const dr=p?35000:28406;if(i<=dr)return 0;return Math.min(d*.05,(i-dr)*.04);}

// ─── Box 2: Aanmerkelijk belang (DGA) ─────────────────────
// 2025: 24.5% tot €67.000, 33% daarboven. Grens verdubbelt bij partners.
function cBox2(inc,partner){
  if(inc<=0)return{tax:0,b1:0,b2:0};
  const lim=partner?134000:67000;
  const b1=Math.min(inc,lim)*.245;
  const b2=inc>lim?(inc-lim)*.33:0;
  return{tax:b1+b2,b1,b2};
}

// ─── Box 3: Vermogensrendementsheffing ────────────────────
// 2025 forfaitair: Spaargeld 1.03%, Beleggingen 6.04%, Schulden 2.47%
// Heffingsvrij vermogen: €57.000 pp (€114.000 partners), Tarief: 36%
const B3_SP=.0103,B3_BL=.0604,B3_SC=.0247,B3_T=.36,B3_V=57000;
function cBox3(spaar,beleg,schuld,partner){
  const vrij=partner?B3_V*2:B3_V;
  const tot=spaar+beleg-schuld;
  const gr=Math.max(0,tot-vrij);
  if(gr<=0||spaar+beleg<=0)return{tax:0,grondslag:0,rendement:0,totVerm:tot};
  const rS=spaar*B3_SP,rB=beleg*B3_BL,rSc=schuld*B3_SC;
  const totR=rS+rB-rSc;
  const pR=totR/(spaar+beleg);
  const fR=gr*Math.max(0,pR);
  return{tax:fR*B3_T,grondslag:gr,rendement:fR,totVerm:tot,pctRen:pR};
}

// ─── Vermogensgrenzen toeslagen ───────────────────────────
// 2025: €127.582 alleenstaand, €161.329 partners
const VG_A=127582,VG_P=161329;
function checkVermGrens(totV,partner){return totV>(partner?VG_P:VG_A);}

// ─── Alimentatie aftrek (persoonsgebonden aftrek Box 1) ───
function cAlimentatie(b){return Math.max(0,b);}

// ─── Lijfrente aftrek ────────────────────────────────────
// Jaarruimte = 13,3% van premiegrondslag - pensioenopbouw. Max €34.649
function cLijfrente(premie,income,pensioenPerc){
  const pg=Math.max(0,income-16322);
  const jr=Math.min(34649,pg*.133-(income*(pensioenPerc/100)*14.4*.133));
  const aftrek=Math.min(premie,Math.max(0,jr));
  return{aftrek,maxJaarruimte:Math.max(0,jr)};
}

// ─── WW/WIA vrijwillige verzekering (ZZP) ────────────────
// WW: ~2.64% van dagloon (max €66.701), WIA: ~8.03% (max €71.628)
function cWWWIA(inc,hasWW,hasWIA){
  const ww=hasWW?Math.min(inc,66701)*.0264:0;
  const wia=hasWIA?Math.min(inc,71628)*.0803:0;
  return{wwKost:ww,wiaKost:wia,totaal:ww+wia};
}

// ─── Gemeentelijke heffingen ─────────────────────────────
const GEM={laag:{ozb:.08,af:280,ri:190,wa:340},midden:{ozb:.10,af:340,ri:230,wa:370},hoog:{ozb:.13,af:400,ri:280,wa:410}};
function cGemHeff(woz,hasHome,cat){
  const g=GEM[cat||"midden"]||GEM.midden;
  const ozb=hasHome?woz*(g.ozb/100):0;
  return{ozb,afval:g.af,riool:g.ri,water:g.wa,totaal:ozb+g.af+g.ri+g.wa};
}

function calc(p){
  const premie=p.lijfrentePremie||0;
  const iS=!p.hasPartner;
  let eT=p.employment>0?p.employment-p.employment*(p.pensioenPerc/100):0;
  let zi=null,zt2=0;
  if(p.zzpIncome>0){zi=cZZP(p.zzpIncome,p.isStarter,p.urenOK);zt2=zi.tp;}
  // Alimentatie & lijfrente (Box 1 aftrek)
  const aliAf=cAlimentatie(p.alimentatieBetaald||0);
  const aliBij=p.alimentatieOntvangen||0;
  const ljr=cLijfrente(p.lijfrentePremie||0,eT+zt2,p.pensioenPerc);
  const wwInc=p.wwwiaIncome||0;
  const t1=Math.max(0,eT+zt2+wwInc+aliBij-aliAf-ljr.aftrek);
  const pn2=p.hasPartner?p.inc2*(p.pensioenPerc/100):0;
  const t2=p.hasPartner?Math.max(0,p.inc2-pn2):0;
  const hy=p.hasHome?cHYP(p.hypotheek,p.rentePerc,p.wozWaarde,Math.max(t1,t2)):{af:0,ew:0,nt:0,jr:0,eb:0};
  const tx1=cT(t1,p.isAOW),tx2=p.hasPartner?cT(t2,false):0;
  const arbInc=eT+zt2;const hL=arbInc>0;
  const ak1=hL?cAK(arbInc,p.isAOW):0,ak2=p.hasPartner&&p.inc2>0?cAK(t2):0;
  const ah1=cAHK(t1,p.isAOW),ah2=p.hasPartner?cAHK(t2):0;
  const le=p.hasPartner?(t1<=t2?1:2):1;
  const ia1=cIACK(arbInc,p.hasKids&&p.kidsU12>0&&(iS||le===1));
  const ia2=p.hasPartner?cIACK(t2,p.hasKids&&p.kidsU12>0&&le===2):0;
  const ok1=cOK(t1,p.isAOW),aok=cAOK(p.isAOW,iS);
  const tC=ak1+ak2+ah1+ah2+ia1+ia2+ok1+aok;
  // Box 3 + vermogenstoets
  const b3=cBox3(p.box3Spaargeld||0,p.box3Beleggingen||0,p.box3Schulden||0,p.hasPartner);
  const vermBlock=checkVermGrens(b3.totVerm,p.hasPartner);
  // Toeslagen (geblokkeerd bij te veel vermogen)
  const tI=t1+t2;
  let zt=0,ht=0,kg=0;
  if(!vermBlock){zt=cZT(tI,p.hasPartner);ht=p.isRenter?cHT(tI,p.hasPartner,p.rent):0;kg=p.hasKids?cKGB(tI,p.hasPartner,p.nKids,iS):0;}
  const ko=(p.hasKids&&p.nKidsOpvang>0)?cKOT(tI,p.hasPartner,p.nKidsOpvang,p.kotUur,p.kotUren):0;
  const kb=p.hasKids?cKB(p.nKids):0;const tT=zt+ht+kg+ko+kb;
  const zv=zi?zi.zv:0;const du=cDUO(tI,p.hasPartner,p.duoSchuld);
  const pn1=p.employment>0?p.employment*(p.pensioenPerc/100):0;
  // Box 2
  const box2=cBox2(p.box2Income||0,p.hasPartner);
  // WW/WIA vrijwillig (ZZP)
  const ww=p.zzpIncome>0?cWWWIA(p.zzpIncome,p.hasVolWW||false,p.hasVolWIA||false):{wwKost:0,wiaKost:0,totaal:0};
  // Gemeente
  const gem=cGemHeff(p.wozWaarde||0,p.hasHome,p.gemCategorie||"midden");
  // Totalen
  const gT=p.employment+p.zzpIncome+(p.hasPartner?p.inc2:0)+wwInc+(p.box2Income||0)+aliBij;
  const tTx=tx1+tx2;
  const nI=gT-tTx+tC+tT+hy.nt-zv-du-pn1-pn2-box2.tax-b3.tax-ww.totaal-gem.totaal-aliAf-premie;
  return{gT,tTx,tC,tT,hy,zv,du,pn1,pn2,nI,zi,kb,ak1,ak2,ah1,ah2,ia1,ia2,ok1,aok,zt,ht,kg,ko,
    eR:gT>0?(tTx+box2.tax+b3.tax-tC+zv+du)/gT:0,mo:nI/12,tx1,tx2,t1,t2,
    box2,b3,ww,gem,ljr,aliAf,aliBij,vermBlock,wwInc};
}
function calcMTR(p,at){const r1=calc({...p,employment:at}),r2=calc({...p,employment:at+100});return{mtr:1-(r2.nI-r1.nI)/100,kept:r2.nI-r1.nI};}

const DEF={employment:36000,zzpIncome:0,hasPartner:false,inc2:0,pensioenPerc:5,isAOW:false,hasKids:false,nKids:1,kidsU12:1,nKidsOpvang:0,kotUur:9.5,kotUren:100,isRenter:true,rent:750,hasHome:false,hypotheek:250000,rentePerc:3.8,wozWaarde:350000,isStarter:false,urenOK:true,duoSchuld:0,provincie:"Noord-Holland",
  // Box 2 & 3
  box2Income:0,box3Spaargeld:0,box3Beleggingen:0,box3Schulden:0,
  // WW/WIA
  wwwiaIncome:0,hasVolWW:false,hasVolWIA:false,
  // Alimentatie
  alimentatieBetaald:0,alimentatieOntvangen:0,
  // Lijfrente
  lijfrentePremie:0,
  // Gemeente
  gemCategorie:"midden",
};

const PROVS=["Noord-Holland","Zuid-Holland","Utrecht","Brabant","Gelderland","Overijssel","Limburg","Friesland","Groningen","Drenthe","Flevoland","Zeeland"];

// ═══════════════════════════════════════════════════════════
// DESIGN — Light-first tokens
// ═══════════════════════════════════════════════════════════
const C={primary:"#0077CC",primarySoft:"#e8f4fd",dark:"#0B1222",card:"#111B2E",border:"#1C2D4A",green:"#16a34a",greenSoft:"#f0fdf4",red:"#dc2626",redSoft:"#fef2f2",amber:"#d97706",amberSoft:"#fffbeb",purple:"#7c3aed",purpleSoft:"#f5f3ff",text:"#e2e8f0",muted:"#94a3b8",dim:"#64748b",white:"#f8fafc",bg:"#fafbfc",lc:"#ffffff",lb:"#e2e5ea",lt:"#0f172a",lm:"#475569",lmSoft:"#94a3b8"};
const F=`'DM Sans',-apple-system,'Segoe UI',sans-serif`;
const M=`'JetBrains Mono','SF Mono',monospace`;
const FURL="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=JetBrains+Mono:wght@400;500;600;700&display=swap";

function useW(){const[w,sW]=useState(800);useEffect(()=>{const h=()=>sW(window.innerWidth);h();window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}

// ═══════════════════════════════════════════════════════════
// INFO TOOLTIPS — Field explanations
// ═══════════════════════════════════════════════════════════
const INFO={
  employment:"Uw bruto jaarsalaris uit loondienst, vóór belasting en premies. Dit staat op uw jaaropgave.",
  zzpIncome:"Netto winst uit uw onderneming (omzet minus kosten). Fiscale aftrekposten worden automatisch berekend.",
  urenOK:"U moet minimaal 1.225 uur per jaar aan uw onderneming besteden voor de zelfstandigenaftrek en startersaftrek.",
  isStarter:"Geldt voor de eerste 5 jaar als ondernemer. Geeft €2.123 extra aftrek bovenop de zelfstandigenaftrek.",
  hasPartner:"Een toeslagpartner beïnvloedt het recht op toeslagen. Samenwonend of getrouwd telt als partner.",
  inc2:"Het bruto jaarsalaris van uw partner. Dit telt mee voor de berekening van toeslagen en heffingskortingen.",
  pensioenPerc:"Percentage van het bruto salaris dat naar pensioen gaat. Verlaagt het belastbaar inkomen.",
  hasKids:"Kinderen onder 18 geven recht op kinderbijslag, kindgebonden budget, IACK en mogelijk kinderopvangtoeslag.",
  housing:"Huurders kunnen huurtoeslag ontvangen (max huur €900). Kopers profiteren van hypotheekrenteaftrek.",
  rent:"De kale huurprijs per maand (zonder servicekosten). Huurtoeslag is mogelijk tot €900/maand.",
  hypotheek:"Het totale hypotheekbedrag. De rente hierover is aftrekbaar in Box 1.",
  rentePerc:"Het jaarlijkse rentepercentage van uw hypotheek.",
  wozWaarde:"De WOZ-waarde van uw woning. Hierover betaalt u eigenwoningforfait (0,35%).",
  isAOW:"Na de AOW-leeftijd betaalt u geen AOW-premie meer, waardoor schijf 1 lager is (19,07% i.p.v. 35,82%).",
  duoSchuld:"Totale resterende studieschuld bij DUO. Aflossing is 4% van inkomen boven de draagkrachtvrije voet.",
  provincie:"Uw provincie helpt ons om relevante adviseurs in uw regio aan te bevelen.",
  // ─── Nieuwe regelingen ───
  box2Income:"Dividend of andere inkomsten uit aanmerkelijk belang (≥5% aandelen in een BV). Tarief: 24,5% tot €67.000, daarboven 33%.",
  box3Spaargeld:"Totaal spaargeld op bankrekeningen. Fictief rendement 1,03% (2025). Heffingsvrij vermogen: €57.000 per persoon.",
  box3Beleggingen:"Waarde van beleggingen (aandelen, crypto, onroerend goed excl. eigen woning). Fictief rendement 6,04%.",
  box3Schulden:"Schulden in Box 3 (excl. hypotheek eigen woning en studieschuld). Verlagen de grondslag.",
  wwwiaIncome:"Bruto jaaruitkering WW of WIA. Belast als Box 1 inkomen, maar er geldt GEEN arbeidskorting over dit deel.",
  alimentatieBetaald:"Partneralimentatie die u betaalt. Dit is aftrekbaar van uw Box 1 inkomen. Kinderalimentatie is niet aftrekbaar.",
  alimentatieOntvangen:"Partneralimentatie die u ontvangt. Dit is belastbaar inkomen in Box 1.",
  lijfrentePremie:"Jaarlijkse inleg in een lijfrenteverzekering of banksparen. Aftrekbaar tot de jaarruimte (max €38.000). Verlaagt Box 1 inkomen.",
  vermogen:"Uw totale vermogen (spaargeld + beleggingen - schulden) wordt getoetst bij toeslagen. Bij te hoog vermogen vervalt recht op zorgtoeslag, huurtoeslag of kindgebonden budget.",
};

function Tip({id}){
  const[show,setShow]=useState(false);
  const txt=INFO[id];if(!txt)return null;
  return <span style={{position:"relative",display:"inline-flex",marginLeft:6,verticalAlign:"middle"}}>
    <span onClick={(e)=>{e.stopPropagation();setShow(!show);}} style={{width:18,height:18,borderRadius:9,background:show?C.primary:C.lb,color:show?"#fff":C.lm,fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>?</span>
    {show&&<div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:C.lt,color:"#fff",padding:"10px 14px",borderRadius:10,fontSize:12,lineHeight:1.5,width:260,zIndex:100,boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}>{txt}<div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:10,height:10,background:C.lt}}/></div>}
  </span>;
}

// ═══════════════════════════════════════════════════════════
// AI-READY: Placeholder for API integration
// ═══════════════════════════════════════════════════════════
// These functions are designed to be replaced with actual AI API calls.
// Currently they return rule-based outputs. To integrate AI:
// 1. Replace the body of generateAIAnalysis() with an API call
// 2. The function receives all scenario data + calculation results
// 3. Return { voordelen:[], nadelen:[], inzichten:[], toelichting:"", needsAdvisor:bool, advisorReason:"" }

function generateAIAnalysis(rCurrent, rNew, current, newScen) {
  // === AI INTEGRATION POINT ===
  // Replace this function body with:
  // const response = await fetch('/api/analyze', { method:'POST', body: JSON.stringify({rCurrent, rNew, current, newScen}) });
  // return await response.json();

  const diff = rNew.nI - rCurrent.nI;
  const dT = rNew.tT - rCurrent.tT;
  const dE = (rNew.eR - rCurrent.eR) * 100;
  const mN = calcMTR(newScen, newScen.employment || 1000);
  const fmt = v => `€${Math.round(Math.abs(v)).toLocaleString("nl-NL")}`;

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
  if (mN.mtr > .55) {
    nadelen.push(`Marginaal tarief ${(mN.mtr * 100).toFixed(0)}% — extra verdienen levert weinig op`);
    inzichten.push(`Hoog marginaal tarief (${(mN.mtr * 100).toFixed(0)}%): Van elke €100 extra houdt u slechts €${Math.round(mN.kept)} over. Overweeg pensioenopbouw of andere aftrekposten.`);
  }
  if (Math.abs(diff) > 5000 || (newScen.zzpIncome > 20000) || (newScen.hasHome && !current.hasHome)) {
    needsAdvisor = true;
    advisorReason = advisorReason || "Bij grote financiële veranderingen is professioneel advies aan te raden.";
  }
  if (inzichten.length === 0) inzichten.push("Kleine inkomensverschillen kunnen groot effect hebben door drempels in het belastingstelsel.");

  return { voordelen, nadelen, inzichten, needsAdvisor, advisorReason };
}

// AI-ready: Situation explanation generator
function generateSituationNote(r, scenario) {
  // === AI INTEGRATION POINT ===
  // Replace with AI call to generate personalized toelichting
  const notes = [];
  if (r.eR > 0.35) notes.push("Uw effectieve belastingdruk is relatief hoog.");
  if (r.tT > 3000) notes.push("U ontvangt significante toeslagen — let op bij inkomensveranderingen.");
  if (scenario.zzpIncome > 0 && !scenario.urenOK) notes.push("Zonder urencriterium mist u de zelfstandigenaftrek.");
  if (r.zt === 0 && !scenario.hasPartner) notes.push("U heeft geen recht meer op zorgtoeslag bij dit inkomen.");
  const mtr = calcMTR(scenario, scenario.employment || 1000);
  if (mtr.mtr > 0.55) notes.push(`Let op: uw marginaal tarief is ${(mtr.mtr*100).toFixed(0)}%.`);
  return notes;
}

// AI-ready: Advisor matching
function getRelevantAdvisors(provincie) {
  // === AI INTEGRATION POINT ===
  // Replace with API call to fetch real advisors based on location + scenario
  const all = [
    {name:"Van der Berg Belastingadviseurs",type:"Belastingadvies",prov:"Noord-Holland",emoji:"🏛️",url:"https://voorbeeld-berg-advies.nl"},
    {name:"FinPlan Amsterdam",type:"Financiële planning",prov:"Noord-Holland",emoji:"📊",url:"https://voorbeeld-finplan.nl"},
    {name:"Kuijpers & Co Accountants",type:"Accountancy",prov:"Utrecht",emoji:"📋",url:"https://voorbeeld-kuijpersco.nl"},
    {name:"Hypotheek Centrum Zuid",type:"Hypotheekadvies",prov:"Brabant",emoji:"🏡",url:"https://voorbeeld-hypocentrumzuid.nl"},
    {name:"De Zaak Administratie",type:"Administratie",prov:"Zuid-Holland",emoji:"💼",url:"https://voorbeeld-dezaakadministratie.nl"},
    {name:"Pension Advies Groep",type:"Pensioenadvies",prov:"Gelderland",emoji:"🎯",url:"https://voorbeeld-pensionadviesgroep.nl"},
    {name:"StartUp Finance",type:"Startup advies",prov:"Zuid-Holland",emoji:"🚀",url:"https://voorbeeld-startupfinance.nl"},
    {name:"Oost-NL Belastingen",type:"Belastingadvies",prov:"Overijssel",emoji:"⚖️",url:"https://voorbeeld-oostnlbelastingen.nl"},
  ];
  return all.filter(a => a.prov === provincie).slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// UI COMPONENTS — Light theme
// ═══════════════════════════════════════════════════════════
function Btn({children,onClick,variant="primary",style:sx={}}){
  const b={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px 28px",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:F,border:"none",transition:"all 0.18s",lineHeight:1.4};
  const v={primary:{background:C.primary,color:"#fff",boxShadow:"0 2px 12px rgba(0,119,204,0.2)"},outline:{background:"transparent",color:C.lt,border:`2px solid ${C.lb}`},green:{background:C.green,color:"#fff"},amber:{background:C.amber,color:"#fff"},ghost:{background:"transparent",color:C.lm,padding:"8px 16px",fontSize:13},soft:{background:C.primarySoft,color:C.primary,border:`1px solid ${C.primary}20`}};
  return <button onClick={onClick} style={{...b,...(v[variant]||v.primary),...sx}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.opacity=".92";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.opacity="1";}}>{children}</button>;
}

// Light-themed slider
function Sl({label,value,onChange,min=0,max=150000,step=500,pre="€",suf="",info}){
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return <div style={{marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <span style={{fontSize:13,fontWeight:500,color:C.lm}}>{label}{info&&<Tip id={info}/>}</span>
      <span style={{fontSize:16,fontWeight:700,fontFamily:M,color:C.lt,background:C.primarySoft,padding:"2px 10px",borderRadius:6}}>{pre}{typeof value==="number"&&value%1!==0?value.toFixed(1):value.toLocaleString("nl-NL")}{suf}</span>
    </div>
    <div style={{position:"relative",height:6,background:C.lb,borderRadius:3}}>
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.primary},${C.primary}cc)`,borderRadius:3,transition:"width 0.1s"}}/>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{width:"100%",height:24,marginTop:-15,opacity:0,cursor:"pointer",position:"relative",zIndex:2}} />
  </div>;
}

// Light-themed toggle
function Tg({label,checked,onChange,info}){
  return <div onClick={()=>onChange(!checked)} style={{display:"flex",gap:12,cursor:"pointer",marginBottom:10,alignItems:"center",padding:"10px 14px",borderRadius:10,background:checked?C.primarySoft:"#f8f9fb",border:`1.5px solid ${checked?C.primary+"40":"#e8eaee"}`,transition:"all 0.2s",userSelect:"none"}}>
    <div style={{width:40,height:22,borderRadius:11,flexShrink:0,background:checked?C.primary:"#cbd5e1",transition:"0.2s",position:"relative"}}><div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:checked?20:2,transition:"0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/></div>
    <span style={{fontSize:13,fontWeight:600,color:checked?C.lt:C.lm}}>{label}{info&&<Tip id={info}/>}</span>
  </div>;
}

function NC({label,value,onChange,options}){
  return <div style={{marginBottom:10}}><div style={{fontSize:11,color:C.lm,marginBottom:4,fontWeight:600}}>{label}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{options.map(n=><div key={n} onClick={()=>onChange(n)} style={{padding:"4px 14px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s",userSelect:"none",background:value===n?C.primary:C.lc,color:value===n?"#fff":C.lm,border:`1.5px solid ${value===n?C.primary:C.lb}`}}>{n}</div>)}</div></div>;
}

function SC({label,value,color=C.primary,soft}){
  return <div style={{background:soft||color+"0a",borderRadius:14,padding:"16px 18px",border:`1px solid ${color}15`,flex:1,minWidth:0}}>
    <div style={{fontSize:11,color:C.lm,marginBottom:6,fontWeight:500}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color,fontFamily:M,letterSpacing:"-.5px"}}>{value}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════
// WATERFALL — Light theme
// ═══════════════════════════════════════════════════════════
function WF({r}){
  const items=[
    {l:"Bruto inkomen",v:r.gT,c:C.primary},
    ...(r.wwInc>0?[{l:"WW/WIA uitkering",v:r.wwInc,c:C.purple}]:[]),
    ...(r.aliBij>0?[{l:"Alimentatie ontv.",v:r.aliBij,c:C.amber}]:[]),
    ...(r.pn1>0||r.pn2>0?[{l:"Pensioenaftrek",v:-(r.pn1+r.pn2),c:C.purple}]:[]),
    ...(r.zi?[{l:"Ondernemersaftrek",v:-(r.zi.za+r.zi.sa+r.zi.mk),c:C.purple}]:[]),
    ...(r.aliAf>0?[{l:"Alimentatie aftrek",v:-r.aliAf,c:C.green}]:[]),
    ...(r.ljr?.aftrek>0?[{l:"Lijfrente aftrek",v:-r.ljr.aftrek,c:C.green}]:[]),
    {l:"Box 1 belasting",v:-r.tTx,c:C.red},
    {l:"Heffingskortingen",v:r.tC,c:C.green},
    ...(r.box2?.tax>0?[{l:"Box 2 belasting",v:-r.box2.tax,c:C.red}]:[]),
    ...(r.b3?.tax>0?[{l:"Box 3 belasting",v:-r.b3.tax,c:C.red}]:[]),
    ...(r.tT>0?[{l:"Toeslagen & KB",v:r.tT,c:C.amber}]:[]),
    ...(r.hy?.nt&&r.hy.nt!==0?[{l:"Hypotheekvoordeel",v:r.hy.nt,c:C.purple}]:[]),
    ...(r.zv>0?[{l:"Zvw-bijdrage",v:-r.zv,c:C.red}]:[]),
    ...(r.ww?.totaal>0?[{l:"WW/WIA premie",v:-r.ww.totaal,c:C.red}]:[]),
    ...(r.gem?.totaal>0?[{l:"Gem. heffingen",v:-r.gem.totaal,c:C.red}]:[]),
    ...(r.du>0?[{l:"DUO-aflossing",v:-r.du,c:C.red}]:[]),
  ];
  const mx=Math.max(r.gT,1)*1.05;
  return <div style={{padding:"16px 0"}}>
    {items.map((it,i)=>{const bw=mx>0?Math.abs(it.v)/mx*100:0;return <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <div style={{width:110,fontSize:12,color:C.lm,textAlign:"right",flexShrink:0,fontWeight:500}}>{it.l}</div>
      <div style={{flex:1,height:24,position:"relative",background:"#f1f5f9",borderRadius:6,overflow:"hidden"}}>
        <div style={{width:`${Math.max(bw,1)}%`,height:"100%",background:it.c+"20",borderRadius:6,transition:"width 0.4s",borderRight:`3px solid ${it.c}`}}/>
        <span style={{position:"absolute",right:10,top:4,fontSize:11,fontWeight:600,fontFamily:M,color:it.v>=0?C.lt:C.red}}>{it.v>=0?"+":"-"}€{Math.round(Math.abs(it.v)).toLocaleString("nl-NL")}</span>
      </div>
    </div>})}
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12,paddingTop:12,borderTop:`2px solid ${C.green}30`}}>
      <div style={{width:110,fontSize:13,color:C.green,textAlign:"right",fontWeight:700,flexShrink:0}}>= Netto</div>
      <span style={{fontSize:24,fontWeight:800,color:C.green,fontFamily:M}}>€{Math.round(r.nI).toLocaleString("nl-NL")}</span>
      <span style={{fontSize:13,color:C.lm,fontWeight:500}}>(€{Math.round(r.mo).toLocaleString("nl-NL")}/mnd)</span>
    </div>
    {/* Vermogensgrenzen warning */}
    {r.vermBlock&&<div style={{marginTop:12,padding:"10px 14px",background:C.amberSoft,borderRadius:8,border:`1px solid ${C.amber}20`,fontSize:12,color:C.amber,lineHeight:1.5}}>
      <strong>⚠ Vermogensgrens overschreden:</strong> Uw vermogen (€{Math.round(r.b3?.totVerm||0).toLocaleString("nl-NL")}) overschrijdt de grens. Zorgtoeslag, huurtoeslag en kindgebonden budget vervallen.
    </div>}
  </div>;
}

// MTR Chart — Light theme
function MTRChart({p,ci}){
  const W=560,H=220,pd={t:30,r:20,b:40,l:50},w=W-pd.l-pd.r,h=H-pd.t-pd.b;
  const pts=[];for(let i=1000;i<=130000;i+=500){const{mtr}=calcMTR(p,i);pts.push({x:i,y:Math.max(0,Math.min(.9,mtr))});}
  const sx=x=>pd.l+(x/130000)*w,sy=y=>pd.t+h-(y/.9)*h;
  const path=pts.map((pt,i)=>`${i?"L":"M"}${sx(pt.x).toFixed(1)},${sy(pt.y).toFixed(1)}`).join(" ");
  const cur=calcMTR(p,ci);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%"}}>
    <defs><linearGradient id="mG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.primary} stopOpacity=".12"/><stop offset="100%" stopColor={C.primary} stopOpacity="0"/></linearGradient></defs>
    <rect x={pd.l} y={pd.t} width={w} height={h} fill="#f8fafc" rx="6" stroke={C.lb} strokeWidth=".5"/>
    {[0,.2,.4,.6,.8].map(v=><g key={v}><line x1={pd.l} x2={pd.l+w} y1={sy(v)} y2={sy(v)} stroke="#e2e8f0" strokeWidth=".5"/><text x={pd.l-6} y={sy(v)+4} textAnchor="end" fill={C.lm} fontSize="10" fontFamily={M}>{v*100}%</text></g>)}
    {[0,25e3,5e4,75e3,1e5,125e3].map(v=><text key={v} x={sx(v)} y={pd.t+h+18} textAnchor="middle" fill={C.lm} fontSize="10" fontFamily={M}>{v/1e3}k</text>)}
    <rect x={sx(43071)} y={pd.t} width={sx(76817)-sx(43071)} height={h} fill="rgba(220,38,38,0.04)" rx="4"/>
    <text x={(sx(43071)+sx(76817))/2} y={pd.t+14} textAnchor="middle" fill={C.red} fontSize="9" fontWeight="600" opacity=".5">PIEKZONE</text>
    <path d={path+`L${sx(130000).toFixed(1)},${sy(0).toFixed(1)}L${sx(1000).toFixed(1)},${sy(0).toFixed(1)}Z`} fill="url(#mG2)"/>
    <path d={path} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx={sx(ci)} cy={sy(Math.max(0,Math.min(.9,cur.mtr)))} r="6" fill={C.red} stroke="#fff" strokeWidth="2.5"/>
    <text x={sx(ci)+(ci>100000?-40:10)} y={sy(cur.mtr)-10} fill={C.red} fontSize="12" fontWeight="700" fontFamily={M}>{(cur.mtr*100).toFixed(0)}%</text>
    <text x={pd.l+w/2} y={H-4} textAnchor="middle" fill={C.lm} fontSize="11">Bruto inkomen →</text>
  </svg>;
}

// ═══════════════════════════════════════════════════════════
// SCENARIO FORM — Light theme with info buttons
// ═══════════════════════════════════════════════════════════
function SF({s,onChange,label,color,mob}){
  const u=(k,v)=>onChange({...s,[k]:v});
  const[showAdv,setShowAdv]=useState(false);
  const hasAdv=(s.box2Income||0)>0||(s.box3Spaargeld||0)>0||(s.box3Beleggingen||0)>0||(s.wwwiaIncome||0)>0||(s.alimentatieBetaald||0)>0||(s.alimentatieOntvangen||0)>0||(s.lijfrentePremie||0)>0;
  const Divider=({children})=><div style={{margin:"18px 0 12px",paddingTop:14,borderTop:`1px solid ${C.lb}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:C.lt}}>{children}</span></div>;

  return <div style={{background:C.lc,borderRadius:16,border:`1.5px solid ${color}25`,padding:mob?"18px":"24px 28px",position:"relative",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}88)`}}/>
    <h3 style={{fontSize:16,fontWeight:800,color,margin:"0 0 20px"}}>{label}</h3>

    {/* Province selector */}
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,fontWeight:500,color:C.lm}}>Provincie<Tip id="provincie"/></span></div>
      <select value={s.provincie||"Noord-Holland"} onChange={e=>u("provincie",e.target.value)} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:14,fontFamily:F,color:C.lt,background:C.lc,cursor:"pointer",outline:"none"}}>
        {PROVS.map(p=><option key={p} value={p}>{p}</option>)}
      </select>
    </div>

    {/* ─── Box 1: Inkomen ─── */}
    <Divider>💰 Inkomen uit arbeid</Divider>
    <Sl label="Bruto jaarsalaris (loondienst)" value={s.employment} onChange={v=>u("employment",v)} info="employment"/>
    <Sl label="Winst uit onderneming / ZZP" value={s.zzpIncome} onChange={v=>u("zzpIncome",v)} info="zzpIncome"/>
    {s.zzpIncome>0&&<div style={{marginLeft:8,marginBottom:8,paddingLeft:14,borderLeft:`2px solid ${C.purple}30`}}>
      <Tg label="Urencriterium (1.225+ uur)" checked={s.urenOK} onChange={v=>u("urenOK",v)} info="urenOK"/>
      <Tg label="Startersaftrek (eerste 5 jaar)" checked={s.isStarter} onChange={v=>u("isStarter",v)} info="isStarter"/>
    </div>}
    <Sl label="WW / WIA uitkering" value={s.wwwiaIncome||0} onChange={v=>u("wwwiaIncome",v)} info="wwwiaIncome"/>

    {/* ─── Persoonlijk ─── */}
    <Divider>👤 Persoonlijke situatie</Divider>
    <Tg label="Partner / samenwonend" checked={s.hasPartner} onChange={v=>{u("hasPartner",v);if(!v)u("inc2",0);}} info="hasPartner"/>
    {s.hasPartner&&<Sl label="Partner bruto jaarsalaris" value={s.inc2} onChange={v=>u("inc2",v)} info="inc2"/>}
    {s.employment>0&&<Sl label="Pensioenpremie" value={s.pensioenPerc} onChange={v=>u("pensioenPerc",v)} min={0} max={15} step={.5} pre="" suf="% van bruto" info="pensioenPerc"/>}
    <Tg label="Kinderen (<18 jaar)" checked={s.hasKids} onChange={v=>u("hasKids",v)} info="hasKids"/>
    {s.hasKids&&<div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}><NC label="Aantal" value={s.nKids} onChange={v=>u("nKids",v)} options={[1,2,3,4]}/><NC label="Onder 12" value={s.kidsU12} onChange={v=>u("kidsU12",v)} options={Array.from({length:s.nKids+1},(_,i)=>i)}/><NC label="In opvang" value={s.nKidsOpvang} onChange={v=>u("nKidsOpvang",v)} options={Array.from({length:s.nKids+1},(_,i)=>i)}/></div>}
    {s.hasKids&&s.nKidsOpvang>0&&<div style={{marginLeft:8}}><Sl label="Uurtarief opvang" value={s.kotUur} onChange={v=>u("kotUur",v)} min={5} max={15} step={.25} pre="€"/><Sl label="Uren opvang/maand" value={s.kotUren} onChange={v=>u("kotUren",v)} min={20} max={230} step={10} pre=""/></div>}

    {/* ─── Wonen ─── */}
    <Divider>🏠 Woonsituatie</Divider>
    <div style={{display:"flex",gap:6,marginBottom:14}}>{[{k:"r",l:"🏢 Huur",a:s.isRenter},{k:"o",l:"🏡 Koop",a:s.hasHome},{k:"n",l:"🏠 Anders",a:!s.isRenter&&!s.hasHome}].map(o=><div key={o.k} onClick={()=>{if(o.k==="r")onChange({...s,isRenter:true,hasHome:false});else if(o.k==="o")onChange({...s,isRenter:false,hasHome:true});else onChange({...s,isRenter:false,hasHome:false});}} style={{flex:1,padding:10,borderRadius:10,textAlign:"center",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s",userSelect:"none",background:o.a?C.primarySoft:"#f8f9fb",border:`1.5px solid ${o.a?C.primary+"40":"#e8eaee"}`,color:o.a?C.primary:C.lm}}>{o.l}</div>)}</div>
    {s.isRenter&&<Sl label="Kale huur/maand" value={s.rent} onChange={v=>u("rent",v)} min={0} max={1500} step={25} info="rent"/>}
    {s.hasHome&&<><Sl label="Hypotheek" value={s.hypotheek} onChange={v=>u("hypotheek",v)} min={0} max={800000} step={5000} info="hypotheek"/><Sl label="Hypotheekrente" value={s.rentePerc} onChange={v=>u("rentePerc",v)} min={1} max={6} step={.1} pre="" suf="%" info="rentePerc"/><Sl label="WOZ-waarde" value={s.wozWaarde} onChange={v=>u("wozWaarde",v)} min={100000} max={1000000} step={10000} info="wozWaarde"/></>}

    {/* ─── Overig basis ─── */}
    <Divider>📋 Overige aftrekposten</Divider>
    <Tg label="AOW-leeftijd bereikt" checked={s.isAOW} onChange={v=>u("isAOW",v)} info="isAOW"/>
    <Sl label="DUO studieschuld" value={s.duoSchuld} onChange={v=>u("duoSchuld",v)} min={0} max={100000} step={1000} info="duoSchuld"/>
    <Sl label="Lijfrentepremie (jaarlijks)" value={s.lijfrentePremie||0} onChange={v=>u("lijfrentePremie",v)} min={0} max={40000} step={250} info="lijfrentePremie"/>

    {/* ─── Geavanceerd (collapsible) ─── */}
    <div onClick={()=>setShowAdv(!showAdv)} style={{margin:"18px 0 0",padding:"12px 16px",background:showAdv?"#f8f9fb":"#fafbfc",borderRadius:10,border:`1.5px solid ${showAdv?C.primary+"30":C.lb}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.2s"}}>
      <span style={{fontSize:13,fontWeight:700,color:showAdv?C.primary:C.lm}}>⚙️ Geavanceerd: Box 2/3, alimentatie{hasAdv?" (actief)":""}</span>
      <span style={{fontSize:12,color:C.lm,transition:"transform 0.2s",display:"inline-block",transform:showAdv?"rotate(180deg)":"rotate(0)"}}>▾</span>
    </div>
    {showAdv&&<div style={{padding:"16px 0 0"}}>

      {/* ─── Alimentatie ─── */}
      <Divider>⚖️ Alimentatie</Divider>
      <Sl label="Partneralimentatie betaald/jaar" value={s.alimentatieBetaald||0} onChange={v=>u("alimentatieBetaald",v)} min={0} max={50000} step={500} info="alimentatieBetaald"/>
      <Sl label="Partneralimentatie ontvangen/jaar" value={s.alimentatieOntvangen||0} onChange={v=>u("alimentatieOntvangen",v)} min={0} max={50000} step={500} info="alimentatieOntvangen"/>

      {/* ─── Box 2 ─── */}
      <Divider>🏢 Box 2 — Aanmerkelijk belang</Divider>
      <Sl label="Dividend / AB-inkomen" value={s.box2Income||0} onChange={v=>u("box2Income",v)} min={0} max={500000} step={1000} info="box2Income"/>

      {/* ─── Box 3 ─── */}
      <Divider>🏦 Box 3 — Vermogen</Divider>
      <Sl label="Spaargeld (banktegoeden)" value={s.box3Spaargeld||0} onChange={v=>u("box3Spaargeld",v)} min={0} max={2000000} step={5000} info="box3Spaargeld"/>
      <Sl label="Beleggingen (aandelen, crypto, etc.)" value={s.box3Beleggingen||0} onChange={v=>u("box3Beleggingen",v)} min={0} max={2000000} step={5000} info="box3Beleggingen"/>
      <Sl label="Schulden in Box 3" value={s.box3Schulden||0} onChange={v=>u("box3Schulden",v)} min={0} max={500000} step={1000} info="box3Schulden"/>
      {/* Vermogensgrenzen indicator */}
      {((s.box3Spaargeld||0)+(s.box3Beleggingen||0))>0&&<div style={{padding:"10px 14px",background:C.primarySoft,borderRadius:8,fontSize:12,color:C.lt,lineHeight:1.5,marginTop:4}}>
        <strong>Vermogen:</strong> €{((s.box3Spaargeld||0)+(s.box3Beleggingen||0)-(s.box3Schulden||0)).toLocaleString("nl-NL")} netto
        <span style={{color:C.lm}}> | Heffingsvrij: €{(s.hasPartner?B3_V*2:B3_V).toLocaleString("nl-NL")}</span>
        <Tip id="vermogen"/>
      </div>}
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════
// NAV (Global) — Same everywhere
// ═══════════════════════════════════════════════════════════
function Nav({page,setPage,goContact,user,onLogout}){
  const[sc,setSc]=useState(false);const[dd,setDd]=useState(false);const[mobMenu,setMobMenu]=useState(false);
  const w=useW();const mob=w<768;
  useEffect(()=>{const h=()=>setSc(window.scrollY>20);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  useEffect(()=>{if(!dd)return;const h=()=>setDd(false);const t=setTimeout(()=>document.addEventListener("click",h),10);return()=>{clearTimeout(t);document.removeEventListener("click",h);};},[dd]);
  useEffect(()=>{setMobMenu(false);setDd(false);},[page]);
  const isA=p=>page===p;const ddItems=[{l:"Over ons",p:"about"},{l:"Partners",p:"partners"}];const isDdA=ddItems.some(d=>d.p===page);
  const ns=a=>({background:"none",border:"none",fontSize:14,fontWeight:600,color:a?C.primary:C.lm,cursor:"pointer",fontFamily:F,padding:"8px 12px",borderRadius:8,transition:"color 0.15s",whiteSpace:"nowrap"});
  return <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:sc||mobMenu?"rgba(255,255,255,0.98)":"transparent",backdropFilter:sc?"blur(12px)":"none",borderBottom:sc?`1px solid ${C.lb}`:"1px solid transparent",boxShadow:sc?"0 1px 12px rgba(0,0,0,0.06)":"none",transition:"all 0.3s"}}>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px",display:"flex",justifyContent:"space-between",alignItems:"center",height:60}}>
      <div onClick={()=>setPage("home")} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",flexShrink:0}}><div style={{width:32,height:32,borderRadius:8,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>€</div><span style={{fontSize:17,fontWeight:800,color:C.lt}}>Netto<span style={{color:C.primary}}>Sim</span></span></div>
      {!mob&&<div style={{display:"flex",alignItems:"center",gap:2}}>
        <button onClick={()=>setPage("home")} style={ns(isA("home"))}>Home</button>
        <button onClick={()=>setPage("app")} style={ns(isA("app"))}>Berekenen</button>
        <div style={{position:"relative"}}><button onClick={e=>{e.stopPropagation();setDd(!dd);}} style={{...ns(isDdA),display:"flex",alignItems:"center",gap:4}}>Platform <span style={{fontSize:10,transition:"transform 0.2s",display:"inline-block",transform:dd?"rotate(180deg)":"rotate(0)"}}>▾</span></button>{dd&&<div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:"#fff",borderRadius:12,border:`1px solid ${C.lb}`,boxShadow:"0 8px 32px rgba(0,0,0,0.10)",padding:6,minWidth:180,zIndex:1001}}>{ddItems.map((d,i)=><div key={i} onClick={()=>{setPage(d.p);setDd(false);}} style={{padding:"10px 14px",borderRadius:8,fontSize:14,fontWeight:600,color:isA(d.p)?C.primary:C.lt,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#f5f7fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{d.l}</div>)}</div>}</div>
        <button onClick={()=>setPage("faq")} style={ns(isA("faq"))}>FAQ</button>
        <button onClick={()=>goContact()} style={ns(isA("contact"))}>Contact</button>
        {user?<button onClick={()=>setPage("profile")} style={ns(isA("profile"))}>Profiel</button>:<button onClick={()=>setPage("login")} style={ns(isA("login"))}>Inloggen</button>}
        <Btn onClick={()=>setPage("app")} style={{padding:"8px 20px",fontSize:13,marginLeft:8}}>Direct Berekenen</Btn>
      </div>}
      {mob&&<div style={{display:"flex",alignItems:"center",gap:8}}><Btn onClick={()=>setPage("app")} style={{padding:"6px 14px",fontSize:12}}>Bereken</Btn><div onClick={()=>setMobMenu(!mobMenu)} style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderRadius:8}}><div style={{display:"flex",flexDirection:"column",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:18,height:2,background:C.lt,borderRadius:1}}/>)}</div></div></div>}
    </div>
    {mob&&mobMenu&&<div style={{background:"#fff",borderTop:`1px solid ${C.lb}`,padding:"12px 20px 20px",display:"flex",flexDirection:"column",gap:2}}>
      {[{l:"Home",p:"home"},{l:"Berekenen",p:"app"},{l:"Over ons",p:"about"},{l:"Partners",p:"partners"},{l:"FAQ",p:"faq"}].map((it,i)=>
        <div key={i} onClick={()=>setPage(it.p)} style={{padding:"12px 14px",borderRadius:8,fontSize:15,fontWeight:600,color:isA(it.p)?C.primary:C.lt,cursor:"pointer",background:isA(it.p)?C.primarySoft:"transparent"}}>{it.l}</div>
      )}
      {user?<div onClick={()=>setPage("profile")} style={{padding:"12px 14px",borderRadius:8,fontSize:15,fontWeight:600,color:isA("profile")?C.primary:C.lt,cursor:"pointer",background:isA("profile")?C.primarySoft:"transparent"}}>Profiel</div>:<div onClick={()=>setPage("login")} style={{padding:"12px 14px",borderRadius:8,fontSize:15,fontWeight:600,color:isA("login")?C.primary:C.lt,cursor:"pointer",background:isA("login")?C.primarySoft:"transparent"}}>Inloggen</div>}
      <div onClick={()=>goContact()} style={{padding:"12px 14px",borderRadius:8,fontSize:15,fontWeight:600,color:isA("contact")?C.primary:C.lt,cursor:"pointer",background:isA("contact")?C.primarySoft:"transparent"}}>Contact</div>
    </div>}
  </nav>;
}

// ═══════════════════════════════════════════════════════════
// LANDING PAGE — Scenarios right under hero
// ═══════════════════════════════════════════════════════════
const NEWS_ITEMS=[
  {tag:"Belasting",title:"Nieuwe schijfgrenzen 2025 officieel bevestigd",body:"De Belastingdienst publiceerde de definitieve tarieven en heffingskortingen voor 2025. NettoSim is hier al op voorbereid.",source:"Rijksoverheid",date:"jan 2025",img:"📄"},
  {tag:"Toeslagen",title:"Aangescherpte vermogensgrenzen toeslagen",body:"Voor zorgtoeslag, huurtoeslag en kindgebonden budget gelden in 2025 nieuwe vermogensdrempels. Vooral spaarders merken dit.",source:"Dienst Toeslagen",date:"jan 2025",img:"🏦"},
  {tag:"Werk & inkomen",title:"Combinatie loondienst + ZZP blijft populair",body:"Steeds meer Nederlanders kiezen voor hybride werken. Fiscale gevolgen zijn complexer door aftrekposten en toeslagen.",source:"CBS / NOS",date:"dec 2024",img:"💼"},
  {tag:"Wonen",title:"Huurgrenzen en huurtoeslag 2025",body:"De maximale huur voor huurtoeslag en de inkomensgrenzen zijn opnieuw aangepast. Vooral middeninkomens voelen dit.",source:"Rijksoverheid",date:"jan 2025",img:"🏠"},
];

function NewsCarousel(){
  const duplicated=[...NEWS_ITEMS,...NEWS_ITEMS];
  const cardMin=280;
  return <section style={{width:"100%",padding:"18px 0 14px",borderBottom:`1px solid ${C.lb}`,background:"#ffffff",overflow:"hidden"}}>
    <style>{`@keyframes newsScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    <div style={{width:"100%",paddingLeft:20,paddingRight:20,marginBottom:10}}>
      <span style={{fontSize:11,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:1.5}}>Nieuws & ontwikkelingen</span>
    </div>
    <div style={{overflow:"hidden",width:"100%"}}>
      <div style={{display:"flex",gap:14,width:"max-content",animation:"newsScroll 32s linear infinite",willChange:"transform"}}>
        {duplicated.map((it,i)=>(
          <div key={i} style={{minWidth:cardMin,flexShrink:0}}>
            <div style={{background:C.bg,borderRadius:14,padding:"12px 14px",border:`1px solid ${C.lb}`,display:"flex",gap:10,marginLeft:7,marginRight:7}}>
              <div style={{width:48,height:48,borderRadius:10,background:C.primarySoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                {it.img}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:C.lm,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.tag} · {it.source} · {it.date}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.lt,marginBottom:2,lineHeight:1.4}}>{it.title}</div>
                <div style={{fontSize:12,color:C.lm,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{it.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>;
}

function Landing({setPage,goContact,user}){
  const howRef=useRef(null);const w=useW();const mob=w<768;
  return <div style={{fontFamily:F,background:C.bg,minHeight:"100vh"}}>
    <Nav page="home" setPage={setPage} goContact={goContact} user={user}/>
    {/* HERO */}
    <section style={{paddingTop:mob?100:130,paddingBottom:mob?32:48,textAlign:"center",background:`linear-gradient(180deg,#f0f7ff 0%,${C.bg} 100%)`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,opacity:.03,backgroundImage:`radial-gradient(${C.primary} 1px,transparent 1px)`,backgroundSize:"32px 32px"}}/>
      <div style={{position:"relative",maxWidth:720,margin:"0 auto",padding:"0 20px"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 18px",borderRadius:50,fontSize:13,fontWeight:600,color:C.primary,background:"#fff",border:`1px solid ${C.primary}20`,marginBottom:24}}>
          <span style={{width:8,height:8,borderRadius:4,background:C.primary,display:"inline-block"}}/>Update: Belastingregels 2025
        </div>
        <h1 style={{fontSize:mob?32:54,fontWeight:900,color:C.lt,lineHeight:1.08,margin:"0 0 20px",letterSpacing:"-1.5px"}}>Maak complexe cijfers{" "}<span style={{color:C.primary,fontStyle:"italic"}}>begrijpelijk</span>.</h1>
        <p style={{fontSize:mob?15:18,color:C.lm,lineHeight:1.65,margin:"0 auto 32px",maxWidth:540}}>De meest complete simulator voor het berekenen van uw netto salaris, sociale lasten en toeslagen volgens de laatste Nederlandse wetgeving.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}><Btn onClick={()=>setPage("app")}>Start Simulator</Btn><Btn onClick={()=>howRef.current?.scrollIntoView({behavior:"smooth"})} variant="outline">Hoe het werkt</Btn></div>
      </div>
    </section>

    <NewsCarousel/>

    {/* SCENARIOS — directly under hero */}
    <section style={{padding:mob?"32px 20px":"48px 24px",maxWidth:1000,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:mob?20:32}}><h2 style={{fontSize:mob?22:28,fontWeight:800,color:C.lt,margin:0}}>Welke levenskeuze onderzoek je?</h2></div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:mob?10:14}}>
        {[{e:"💼",t:"Salarisverhoging",d:"Hoeveel netto van meer bruto?"},{e:"🧑‍💻",t:"ZZP naast baan",d:"Loondienst + eigen klanten."},{e:"🏡",t:"Huis kopen",d:"Van huur naar koop, fiscaal."},{e:"👶",t:"Gezinsuitbreiding",d:"Budget, bijslag, opvangtoeslag."},{e:"👫",t:"Samenwonen",d:"Fiscaal partnerschap."},{e:"🚀",t:"Volledig ZZP",d:"Loondienst opzeggen."}].map((c,i)=><div key={i} onClick={()=>setPage("app")} style={{background:C.lc,borderRadius:14,padding:mob?"16px":"20px",border:`1.5px solid ${C.lb}`,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary+"50";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.06)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.lb;e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="none";}}><div style={{fontSize:mob?24:28,marginBottom:8}}>{c.e}</div><h4 style={{fontSize:mob?13:15,fontWeight:700,color:C.lt,margin:"0 0 4px"}}>{c.t}</h4><p style={{fontSize:mob?11:13,color:C.lm,lineHeight:1.5,margin:0}}>{c.d}</p></div>)}
      </div>
    </section>

    {/* TRUST */}
    <section style={{padding:"28px 20px",textAlign:"center",borderTop:`1px solid ${C.lb}`,borderBottom:`1px solid ${C.lb}`}}><div style={{display:"flex",justifyContent:"center",gap:mob?16:40,flexWrap:"wrap",opacity:.45}}>{["Belastingdienst","Dienst Toeslagen","SVB","Rijksoverheid"].map((s,i)=><span key={i} style={{fontSize:mob?12:14,fontWeight:700,color:C.lt}}>{s}</span>)}</div></section>

    {/* HOW IT WORKS */}
    <section ref={howRef} style={{padding:mob?"48px 20px":"80px 24px",maxWidth:1000,margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:mob?28:48}}><div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5}}>Hoe het werkt</div><h2 style={{fontSize:mob?24:34,fontWeight:900,color:C.lt,margin:0}}>In drie stappen naar inzicht</h2></div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:mob?14:20}}>{[{s:"01",ic:"📋",t:"Huidige situatie",d:"Vul uw inkomen en omstandigheden in. Alle 14 regelingen worden berekend."},{s:"02",ic:"🔄",t:"Nieuw scenario",d:"Simuleer een verandering. Zie direct het effect op netto en toeslagen."},{s:"03",ic:"📊",t:"Vergelijk & beslis",d:"Vergelijking met AI-analyse, voor- en nadelen, en advies op maat."}].map((s,i)=><div key={i} style={{background:C.lc,borderRadius:16,padding:mob?"22px 18px":"28px 24px",border:`1px solid ${C.lb}`,position:"relative"}}><div style={{fontSize:42,fontWeight:900,color:C.primary+"10",fontFamily:M,position:"absolute",top:14,right:16}}>{s.s}</div><div style={{fontSize:32,marginBottom:12}}>{s.ic}</div><h3 style={{fontSize:17,fontWeight:800,color:C.lt,margin:"0 0 6px"}}>{s.t}</h3><p style={{fontSize:13,color:C.lm,lineHeight:1.6,margin:0}}>{s.d}</p></div>)}</div>
    </section>

    {/* CTA */}
    <section style={{padding:mob?"48px 20px":"64px 24px",background:`linear-gradient(135deg,${C.dark},#0f1f3a)`,textAlign:"center"}}><h2 style={{fontSize:mob?22:30,fontWeight:900,color:"#fff",margin:"0 0 12px"}}>Klaar om te rekenen?</h2><p style={{fontSize:15,color:C.muted,margin:"0 0 28px"}}>Gratis, geen registratie. Uw gegevens worden niet opgeslagen.</p><Btn onClick={()=>setPage("app")} style={{fontSize:16,padding:"14px 36px"}}>Start Simulator →</Btn></section>

    {/* FOOTER */}
    <footer style={{padding:"28px 20px",borderTop:`1px solid ${C.lb}`,background:"#fff"}}><div style={{maxWidth:1000,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:6,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>€</div><span style={{fontSize:14,fontWeight:800,color:C.lt}}>Netto<span style={{color:C.primary}}>Sim</span></span></div><div style={{fontSize:11,color:C.lmSoft}}>Vereenvoudigd rekenmodel. Geen rechten aan te ontlenen. Bron: Belastingdienst 2025.</div></div></footer>
  </div>;
}

// ═══════════════════════════════════════════════════════════
// SIMULATOR PAGE — Light theme, visual dashboard feel
// ═══════════════════════════════════════════════════════════
function SimPage({setPage,goContact,user,onSaveScenario,loadSavedScenario}){
  const[cur,setCur]=useState({...DEF});const[nw,setNw]=useState({...DEF});const[tab,setTab]=useState("current");
  const[selectedScenario,setSelectedScenario]=useState(null);
  const[featuredAdvisor,setFeaturedAdvisor]=useState(null);
  const[advFormName,setAdvFormName]=useState("");
  const[advFormEmail,setAdvFormEmail]=useState("");
  const[advFormMsg,setAdvFormMsg]=useState("");
  const[advSent,setAdvSent]=useState(false);
  const[showToeslagDetails,setShowToeslagDetails]=useState(false);
  const[showFeedbackModal,setShowFeedbackModal]=useState(false);
  const[feedbackStars,setFeedbackStars]=useState(0);
  const[feedbackHover,setFeedbackHover]=useState(0);
  const[feedbackText,setFeedbackText]=useState("");
  const[feedbackSent,setFeedbackSent]=useState(false);
  const[savedScenario,setSavedScenario]=useState(null);
  useEffect(()=>{if(loadSavedScenario){const d=loadSavedScenario();setSavedScenario(d&&(d.cur||d.nw)?d:null);}}, [user?.id, loadSavedScenario]);
  const w=useW();const mob=w<768;
  const rC=useMemo(()=>calc(cur),[JSON.stringify(cur)]);const rN=useMemo(()=>calc(nw),[JSON.stringify(nw)]);
  const copyToNew=()=>setNw({...cur});
  const diff=rN.nI-rC.nI;const fmt=v=>`€${Math.round(Math.abs(v)).toLocaleString("nl-NL")}`;
  const mC=calcMTR(cur,cur.employment||1000),mN=calcMTR(nw,nw.employment||1000);
  const ai=useMemo(()=>generateAIAnalysis(rC,rN,cur,nw),[JSON.stringify(rC),JSON.stringify(rN)]);
  const notesCur=useMemo(()=>generateSituationNote(rC,cur),[JSON.stringify(rC)]);
  const notesNew=useMemo(()=>generateSituationNote(rN,nw),[JSON.stringify(rN)]);
  const advisors=useMemo(()=>getRelevantAdvisors(nw.provincie||"Noord-Holland"),[nw.provincie]);
  const totalTax=r=>r.tTx+(r.box2?.tax||0)+(r.b3?.tax||0);
  const pdfData=useMemo(()=>buildPdfData({rC,rN,diff,C}),[JSON.stringify(rC),JSON.stringify(rN),diff]);
  const insightForm=useMemo(()=>({
    ownsHome:nw.hasHome,
    isZZP:(nw.zzpIncome||0)>0,
    hasBV:false,
    hasInternationalIncome:false,
    isFiscalPartner:nw.hasPartner,
    box3Cash:nw.box3Spaargeld||0,
    box3Investments:nw.box3Beleggingen||0,
    zzpHours:0,
    zzpProfit:nw.zzpIncome||0,
    mortgageInterest:nw.hypotheek>0?nw.hypotheek*(nw.rentePerc/100):0,
    incomeEmployment:nw.employment||0,
  }),[JSON.stringify(nw)]);
  const {cards:insightCards}=useMemo(()=>buildInsights(insightForm,"results"),[JSON.stringify(insightForm)]);
  const scenarioCards=[
    {e:"💼",t:"Salarisverhoging of nieuwe baan",d:"Meer bruto salaris, wat blijft netto over?",preset:{employment:42000}},
    {e:"🧑‍💻",t:"ZZP starten naast baan",d:"Loondienst combineren met eigen onderneming.",preset:{employment:36000,zzpIncome:15000,urenOK:false}},
    {e:"🏡",t:"Huis kopen (huur → koop)",d:"Van huur naar koop met hypotheekrenteaftrek.",preset:{isRenter:false,hasHome:true,hypotheek:300000,rentePerc:3.8,wozWaarde:380000}},
    {e:"👶",t:"Gezinsuitbreiding",d:"Kinderen, toeslagen en kinderopvang.",preset:{hasKids:true,nKids:1,kidsU12:1}},
    {e:"👫",t:"Gaan samenwonen / trouwen",d:"Fiscaal partnerschap en toeslagen.",preset:{hasPartner:true,inc2:30000}},
    {e:"🚀",t:"Volledig zelfstandig worden",d:"Loondienst opzeggen, volledig ZZP.",preset:{employment:0,zzpIncome:55000,urenOK:true}},
  ];

  const applyScenario=(preset,index)=>{
    const base={...DEF,...preset};
    setCur(base);
    setNw(base);
    setTab("current");
    setSelectedScenario(index);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const tabs=[{k:"current",l:mob?"① Huidig":"① Huidige situatie",c:C.primary},{k:"new",l:mob?"② Nieuw":"② Nieuw scenario",c:C.green},{k:"compare",l:mob?"③ Vergelijk":"③ Vergelijking",c:C.amber},{k:"decide",l:mob?"④ Resultaat":"④ Resultaat",c:C.purple}];

  const Card=({children,sx})=><div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:mob?"16px":"22px 26px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.03)",...sx}}>{children}</div>;
  const SectionTitle=({children})=><h4 style={{fontSize:14,fontWeight:700,color:C.lt,margin:"0 0 14px",display:"flex",alignItems:"center",gap:8}}>{children}</h4>;

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}>
    <Nav page="app" setPage={setPage} goContact={goContact} user={user}/>
    <div style={{maxWidth:860,margin:"0 auto",padding:mob?"74px 14px 60px":"84px 20px 60px",width:"100%"}}>

      {/* Quick scenario selection, same style as landing */}
      <div style={{marginBottom:mob?24:32}}>
        <h2 style={{fontSize:mob?22:26,fontWeight:800,color:C.lt,margin:"0 0 6px"}}>In welke situatie zit je?</h2>
        <p style={{fontSize:mob?13:14,color:C.lm,lineHeight:1.6,margin:"0 0 16px"}}>
          Kies een scenario dat het beste past. Je kunt daarna alle waarden nog fijn‑tunen in de simulator.
        </p>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:mob?10:12}}>
          {scenarioCards.map((c,i)=>(
            <div
              key={i}
              onClick={()=>applyScenario(c.preset,i)}
              style={{
                background:selectedScenario===i?C.primarySoft:C.lc,
                borderRadius:14,
                padding:mob?"14px 12px":"18px 16px",
                border:selectedScenario===i?`2px solid ${C.primary}`:`1px solid ${C.lb}`,
                cursor:"pointer",
                transition:"all 0.18s",
                boxShadow:selectedScenario===i?"0 4px 14px rgba(0,119,204,0.15)":"none",
              }}
              onMouseEnter={e=>{
                if(selectedScenario!==i){e.currentTarget.style.borderColor=C.primary+"50";e.currentTarget.style.background="#f8fafc";}
                e.currentTarget.style.transform="translateY(-2px)";
                e.currentTarget.style.boxShadow=selectedScenario===i?"0 6px 18px rgba(0,119,204,0.2)":"0 6px 18px rgba(15,23,42,0.08)";
              }}
              onMouseLeave={e=>{
                if(selectedScenario!==i){e.currentTarget.style.borderColor=C.lb;e.currentTarget.style.background=C.lc;}
                e.currentTarget.style.transform="translateY(0)";
                e.currentTarget.style.boxShadow=selectedScenario===i?"0 4px 14px rgba(0,119,204,0.15)":"none";
              }}
            >
              <div style={{fontSize:mob?22:26,marginBottom:6}}>{c.e}</div>
              <div style={{fontSize:mob?13:14,fontWeight:700,color:C.lt,margin:"0 0 4px"}}>{c.t}</div>
              <div style={{fontSize:12,color:C.lm,lineHeight:1.5}}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:mob?"8px 14px":"10px 20px",borderRadius:10,fontSize:mob?12:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",background:tab===t.k?t.c+"0f":"transparent",color:tab===t.k?t.c:C.lmSoft,border:`1.5px solid ${tab===t.k?t.c+"35":"transparent"}`,fontFamily:F}}>{t.l}</button>)}
      </div>

      {/* STEP 1 */}
      {tab==="current"&&<div>
        <Card sx={{background:C.primarySoft,borderColor:C.primary+"20"}}><div style={{fontSize:14,color:C.lt,lineHeight:1.6}}>Vul hieronder je <strong>huidige</strong> financiële situatie in. Klik op <span style={{display:"inline-flex",width:16,height:16,borderRadius:8,background:C.lb,fontSize:9,fontWeight:700,color:C.lm,alignItems:"center",justifyContent:"center",verticalAlign:"middle"}}>?</span> voor uitleg bij elk veld.</div></Card>
        <SF s={cur} onChange={setCur} label="Huidige situatie" color={C.primary} mob={mob}/>
        <Card sx={{marginTop:16}}>
          <SectionTitle>📊 Overzicht</SectionTitle>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><SC label="Netto/maand" value={`€${Math.round(rC.mo).toLocaleString("nl-NL")}`} color={C.green} soft={C.greenSoft}/><SC label="Eff. tarief" value={`${(rC.eR*100).toFixed(1)}%`} color={C.amber} soft={C.amberSoft}/><SC label="Toeslagen/jaar" value={`€${Math.round(rC.tT).toLocaleString("nl-NL")}`} color={C.primary} soft={C.primarySoft}/></div>
          <WF r={rC}/>
          {notesCur.length>0&&<div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",borderRadius:10,border:`1px solid ${C.lb}`}}><div style={{fontSize:12,fontWeight:700,color:C.lm,marginBottom:6}}>💡 Toelichting huidige situatie</div>{notesCur.map((n,i)=><div key={i} style={{fontSize:12,color:C.lm,marginBottom:3,paddingLeft:10,borderLeft:`2px solid ${C.primary}30`}}>{n}</div>)}</div>}
        </Card>
        <div style={{textAlign:"center",marginTop:20}}><Btn onClick={()=>{copyToNew();setTab("new");}} variant="green">Door naar nieuw scenario →</Btn></div>
        {user&&onSaveScenario&&<div style={{textAlign:"center",marginTop:10}}><Btn onClick={()=>{onSaveScenario({cur,nw});}} variant="ghost" style={{fontSize:12}}>💾 Opslaan in mijn profiel</Btn></div>}
        {savedScenario&&(savedScenario.cur||savedScenario.nw)&&<div style={{textAlign:"center",marginTop:8}}><Btn onClick={()=>{if(savedScenario.cur)setCur(savedScenario.cur);if(savedScenario.nw)setNw(savedScenario.nw);}} variant="ghost" style={{fontSize:12}}>📂 Laad opgeslagen situatie</Btn></div>}
      </div>}

      {/* STEP 2 */}
      {tab==="new"&&<div>
        <Card sx={{background:C.greenSoft,borderColor:C.green+"20"}}><div style={{fontSize:14,color:C.lt,lineHeight:1.6}}>Pas aan wat je wilt <strong>veranderen</strong>. Start vanuit je huidige situatie.</div></Card>
        <div style={{marginBottom:14}}><Btn onClick={copyToNew} variant="ghost">↻ Reset naar huidig</Btn></div>
        <SF s={nw} onChange={setNw} label="Nieuw scenario" color={C.green} mob={mob}/>
        <Card sx={{marginTop:16}}>
          <SectionTitle>📊 Overzicht</SectionTitle>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}><SC label="Netto/maand" value={`€${Math.round(rN.mo).toLocaleString("nl-NL")}`} color={C.green} soft={C.greenSoft}/><SC label="Eff. tarief" value={`${(rN.eR*100).toFixed(1)}%`} color={C.amber} soft={C.amberSoft}/><SC label="Toeslagen/jaar" value={`€${Math.round(rN.tT).toLocaleString("nl-NL")}`} color={C.primary} soft={C.primarySoft}/></div>
          <WF r={rN}/>
          {notesNew.length>0&&<div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",borderRadius:10,border:`1px solid ${C.lb}`}}><div style={{fontSize:12,fontWeight:700,color:C.lm,marginBottom:6}}>💡 Toelichting nieuw scenario</div>{notesNew.map((n,i)=><div key={i} style={{fontSize:12,color:C.lm,marginBottom:3,paddingLeft:10,borderLeft:`2px solid ${C.green}30`}}>{n}</div>)}</div>}
        </Card>
        <div style={{textAlign:"center",marginTop:20}}><Btn onClick={()=>setTab("compare")} variant="amber" style={{color:"#fff"}}>Vergelijken →</Btn></div>
      </div>}

      {/* STEP 3 */}
      {tab==="compare"&&<div>
        <Card sx={{background:diff>=0?C.greenSoft:C.redSoft,borderColor:(diff>=0?C.green:C.red)+"25",textAlign:"center",padding:"28px"}}>
          <div style={{fontSize:13,color:C.lm,marginBottom:6}}>Netto verschil per jaar</div>
          <div style={{fontSize:mob?30:42,fontWeight:900,fontFamily:M,color:diff>=0?C.green:C.red,letterSpacing:"-1px"}}>{diff>=0?"+":"-"}{fmt(diff)}</div>
          <div style={{fontSize:14,color:C.lm,marginTop:4}}>= {diff>=0?"+":"-"}{fmt(diff/12)} per maand</div>
        </Card>
        <Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:6}}>
            <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.primary}}>Huidig</div><div style={{textAlign:"center",fontSize:10,color:C.lmSoft}}>Δ</div><div style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.green}}>Nieuw</div>
            {[{l:"Netto/mnd",a:rC.mo,b:rN.mo},
              {l:"Bruto",a:rC.gT,b:rN.gT},
              {l:"Totale belasting",a:totalTax(rC),b:totalTax(rN),f:1},
              {l:"Kortingen",a:rC.tC,b:rN.tC},
              {l:"Toeslagen totaal",a:rC.tT,b:rN.tT},
              {l:"Zorgtoeslag",a:rC.zt,b:rN.zt},
              {l:"Huurtoeslag",a:rC.ht,b:rN.ht},
              {l:"Kindgebonden budget",a:rC.kg,b:rN.kg},
              {l:"Kinderopvangtoeslag",a:rC.ko,b:rN.ko},
              {l:"Kinderbijslag",a:rC.kb,b:rN.kb},
              {l:"Eff.%",a:rC.eR*100,b:rN.eR*100,p:1,f:1},
              {l:"Marg.%",a:mC.mtr*100,b:mN.mtr*100,p:1,f:1}].map((r,i)=>{const d=r.b-r.a;const ip=r.f?d<0:d>0;const dc=Math.abs(d)<.5?C.lmSoft:ip?C.green:C.red;const hasToeslagen=(rC.zt+rC.ht+rC.kg+rC.ko+rC.kb+rN.zt+rN.ht+rN.kg+rN.ko+rN.kb)>0;const isToesRow=r.l==="Toeslagen totaal";return[
              <div key={`a${i}`} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#f8fafc",borderRadius:8,border:`1px solid ${C.lb}`}}>
                <span style={{fontSize:11,color:C.lm,display:"flex",alignItems:"center",gap:6}}>
                  <span>{r.l}</span>
                  {isToesRow&&hasToeslagen&&<button onClick={()=>setShowToeslagDetails(!showToeslagDetails)} style={{border:"none",background:"transparent",padding:0,cursor:"pointer",fontSize:12,fontWeight:800,color:C.primary,lineHeight:1}}>
                    {showToeslagDetails? "−":"+"}
                  </button>}
                </span>
                <span style={{fontSize:13,fontWeight:700,fontFamily:M,color:C.lt}}>{r.p?`${r.a.toFixed(1)}%`:`€${Math.round(r.a).toLocaleString("nl-NL")}`}</span>
              </div>,
              <div key={`d${i}`} style={{display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,fontWeight:700,fontFamily:M,color:dc}}>{d>=0?"+":""}{r.p?`${d.toFixed(1)}%`:`€${Math.round(d).toLocaleString("nl-NL")}`}</span></div>,
              <div key={`b${i}`} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#f8fafc",borderRadius:8,border:`1px solid ${C.lb}`}}><span style={{fontSize:11,color:C.lm}}>{r.l}</span><span style={{fontSize:13,fontWeight:700,fontFamily:M,color:C.lt}}>{r.p?`${r.b.toFixed(1)}%`:`€${Math.round(r.b).toLocaleString("nl-NL")}`}</span></div>
            ]})}
          </div>
        </Card>
        {showToeslagDetails&&(rC.tT>0||rN.tT>0)&&<Card sx={{marginTop:10,background:"#f8fafc"}}>
          <SectionTitle>🔍 Uitsplitsing toeslagen</SectionTitle>
          <div style={{fontSize:12,color:C.lm,marginBottom:8}}>Zie per regeling hoe de toeslagen veranderen.</div>
          {[{l:"Zorgtoeslag",a:rC.zt,b:rN.zt},
            {l:"Huurtoeslag",a:rC.ht,b:rN.ht},
            {l:"Kindgebonden budget",a:rC.kg,b:rN.kg},
            {l:"Kinderopvangtoeslag",a:rC.ko,b:rN.ko},
            {l:"Kinderbijslag",a:rC.kb,b:rN.kb}].filter(r=>r.a!==0||r.b!==0).map((r,i)=>{const d=r.b-r.a;const dc=Math.abs(d)<.5?C.lmSoft:d>0?C.green:C.red;return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:i===0?"none":`1px dashed ${C.lb}`}}>
                <span style={{fontSize:12,color:C.lm}}>{r.l}</span>
                <span style={{fontSize:12,fontFamily:M,color:C.lm}}>€{Math.round(r.a).toLocaleString("nl-NL")} → €{Math.round(r.b).toLocaleString("nl-NL")}</span>
                <span style={{fontSize:12,fontFamily:M,color:dc}}>{d>=0?"+":""}€{Math.round(d).toLocaleString("nl-NL")}</span>
              </div>
            );})}
        </Card>}
        <Card>
          <SectionTitle>📈 Marginaal tarief — Nieuw scenario</SectionTitle>
          {nw.employment>0
            ? <MTRChart p={nw} ci={nw.employment||1000}/>
            : <div style={{fontSize:13,color:C.lm,lineHeight:1.6}}>
                Marginaal tarief is alleen berekend op basis van loondienst inkomen. Vul een loondienst bedrag in om de grafiek te zien.
              </div>}
        </Card>
        <div style={{textAlign:"center",marginTop:16}}><Btn onClick={()=>setTab("decide")} style={{background:`linear-gradient(135deg,${C.purple},${C.primary})`,color:"#fff"}}>Resultaat bekijken →</Btn></div>
      </div>}

      {/* STEP 4 — Resultaat & advies */}
      {tab==="decide"&&<div>
        <Card sx={{background:`radial-gradient(circle at top left,${C.primarySoft},${C.purpleSoft})`,borderColor:C.purple+"25",padding:mob?"22px 18px":"26px 26px"}}>
          <div style={{display:"flex",flexDirection:mob?"column":"row",gap:mob?14:20,alignItems:mob?"stretch":"center",justifyContent:"space-between"}}>
            <div style={{flex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:8,padding:"4px 10px",borderRadius:999,background:"rgba(255,255,255,0.6)",border:`1px solid ${C.primary}20`}}>
                <span style={{fontSize:11,fontWeight:700,color:C.purple,letterSpacing:1,textTransform:"uppercase"}}>Resultaat</span>
                <span style={{fontSize:11,color:C.lm}}>Nieuw scenario vs. huidig</span>
              </div>
              <div style={{fontSize:13,color:C.lm,marginBottom:6}}>Maandelijks verschil in netto besteedbaar inkomen</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:mob?32:46,fontWeight:900,fontFamily:M,letterSpacing:"-2px",color:diff>=0?C.green:C.red}}>
                  {diff>=0?"+":"-"}€{Math.round(Math.abs(diff/12)).toLocaleString("nl-NL")}
                </span>
                <span style={{fontSize:13,color:C.lm}}>per maand</span>
              </div>
              <div style={{fontSize:12,color:C.lm,marginTop:4}}>
                {diff>=0?"Je houdt naar schatting elke maand meer over.":"Je houdt naar schatting elke maand minder over."}
              </div>
            </div>
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",gap:8,minWidth:mob?0:190}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:110,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.85)",border:`1px solid ${C.lb}`}}>
                  <div style={{fontSize:11,color:C.lm,marginBottom:2}}>Netto/jaar verschil</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:M,color:diff>=0?C.green:C.red}}>
                    {diff>=0?"+":"-"}€{Math.round(Math.abs(diff)).toLocaleString("nl-NL")}
                  </div>
                </div>
                <div style={{flex:1,minWidth:110,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.85)",border:`1px solid ${C.lb}`}}>
                  <div style={{fontSize:11,color:C.lm,marginBottom:2}}>Effectief tarief</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:M,color:C.amber}}>
                    {(rN.eR*100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:C.lm,marginTop:2}}>
                Tip: kijk ook naar de details bij <span style={{fontWeight:600,color:C.primary}}>Vergelijking</span> voor toeslagen en belastingen.
              </div>
            </div>
          </div>
        </Card>

        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <PDFDownloadLink
            document={<ResultsReportPDF data={pdfData} />}
            fileName="NettoSim-resultaten.pdf"
            style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"all 0.18s",lineHeight:1.4,background:"transparent",color:C.lt,border:`2px solid ${C.lb}`,textDecoration:"none"}}
          >
            {({loading})=>(loading?"PDF maken...":"📄 Download PDF")}
          </PDFDownloadLink>
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,marginBottom:16}}>
          <Card sx={{background:C.greenSoft,borderColor:C.green+"20"}}><SectionTitle>✅ Voordelen</SectionTitle>{ai.voordelen.length===0?<div style={{fontSize:13,color:C.lm}}>Geen significante voordelen gevonden</div>:ai.voordelen.map((p,i)=><div key={i} style={{fontSize:13,color:C.lt,marginBottom:8,paddingLeft:10,borderLeft:`3px solid ${C.green}40`,lineHeight:1.5}}>{p}</div>)}</Card>
          <Card sx={{background:C.redSoft,borderColor:C.red+"20"}}><SectionTitle>⚠️ Nadelen & risico's</SectionTitle>{ai.nadelen.length===0?<div style={{fontSize:13,color:C.lm}}>Geen significante nadelen gevonden</div>:ai.nadelen.map((c,i)=><div key={i} style={{fontSize:13,color:C.lt,marginBottom:8,paddingLeft:10,borderLeft:`3px solid ${C.red}40`,lineHeight:1.5}}>{c}</div>)}</Card>
        </div>

        <Card sx={{background:C.amberSoft,borderColor:C.amber+"20"}}><SectionTitle>💡 Inzichten</SectionTitle><div style={{fontSize:13,color:C.lt,lineHeight:1.7}}>{ai.inzichten.map((ins,i)=><p key={i} style={{margin:"0 0 8px"}}>{ins}</p>)}</div></Card>

        {/* Advisor recommendation — AI-powered */}
        {ai.needsAdvisor&&<Card sx={{background:`linear-gradient(135deg,${C.primarySoft},#f0f7ff)`,borderColor:C.primary+"25"}}>
          <SectionTitle>🤝 Professioneel advies aanbevolen</SectionTitle>
          <p style={{fontSize:13,color:C.lm,margin:"0 0 16px",lineHeight:1.6}}>{ai.advisorReason}</p>
          {advisors.length>0&&<>
            <div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:10}}>Specialisten in {nw.provincie||"uw regio"}:</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {advisors.map((a,i)=>{
                const isOpen=featuredAdvisor&&featuredAdvisor.name===a.name;
                return (
                  <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.lb}`,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
                      <div style={{width:40,height:40,borderRadius:10,background:C.primarySoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{a.emoji}</div>
                      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.lt}}>{a.name}</div><div style={{fontSize:12,color:C.primary,fontWeight:600}}>{a.type}</div></div>
                      <Btn onClick={()=>{setFeaturedAdvisor(isOpen?null:a);setAdvSent(false);setAdvFormName("");setAdvFormEmail("");setAdvFormMsg("");}} style={{padding:"6px 14px",fontSize:11,borderRadius:8}}>{isOpen?"Sluiten":"Contact"}</Btn>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"16px 18px",borderTop:`1px solid ${C.lb}`,background:"#fafbfc"}}>
                        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
                          <div style={{width:56,height:56,borderRadius:16,background:C.primarySoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>{a.emoji}</div>
                          <div>
                            <div style={{fontSize:15,fontWeight:800,color:C.lt}}>{a.name}</div>
                            <div style={{fontSize:12,color:C.primary,fontWeight:600}}>{a.type}</div>
                            <div style={{fontSize:11,color:C.lm,marginTop:2}}>Direct bericht sturen naar deze specialist.</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                          {a.url&&<Btn onClick={()=>window.open(a.url,"_blank")} variant="soft" style={{padding:"8px 12px",fontSize:12}}>Bezoek website</Btn>}
                        </div>
                        {advSent?<div style={{padding:"12px 0",textAlign:"center",fontSize:13,color:C.green,fontWeight:600}}>Bericht verzonden. De specialist neemt zo snel mogelijk contact op.</div>:<>
                          <div style={{display:"grid",gap:8}}>
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:C.lm,marginBottom:3}}>Naam</div>
                              <input value={advFormName} onChange={e=>setAdvFormName(e.target.value)} placeholder="Je naam" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.lb}`,fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/>
                            </div>
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:C.lm,marginBottom:3}}>E-mail</div>
                              <input value={advFormEmail} onChange={e=>setAdvFormEmail(e.target.value)} placeholder="naam@voorbeeld.nl" style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.lb}`,fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/>
                            </div>
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:C.lm,marginBottom:3}}>Bericht</div>
                              <textarea value={advFormMsg} onChange={e=>setAdvFormMsg(e.target.value)} rows={3} placeholder={`Vertel kort je situatie voor ${a.name}...`} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.lb}`,fontSize:13,outline:"none",resize:"vertical"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/>
                            </div>
                          </div>
                          <div style={{marginTop:10,textAlign:"right"}}>
                            <Btn onClick={()=>setAdvSent(true)} style={{padding:"8px 18px",fontSize:13}}>Verstuur bericht</Btn>
                          </div>
                        </>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>}
          {advisors.length===0&&<div style={{fontSize:13,color:C.lm}}>Geen specifieke partners gevonden in {nw.provincie}. <span style={{color:C.primary,cursor:"pointer",textDecoration:"underline"}} onClick={()=>setPage("partners")}>Bekijk alle partners →</span></div>}
        </Card>}

        <InsightsPanel cards={insightCards} userKey="anon" C={C} onNavigate={(r)=>setPage(r)}/>

        <Card sx={{background:"#fffbeb",borderColor:"#fbbf2420"}}><div style={{fontSize:12,color:C.lm,lineHeight:1.7}}><strong style={{color:C.amber}}>⚠ Disclaimer:</strong> Vereenvoudigd rekenmodel voor educatieve doeleinden. Gebruik toeslagen.nl/proefberekening voor exacte bedragen. Raadpleeg een belastingadviseur. Geen rechten aan te ontlenen. Bron: Belastingdienst 2025.</div></Card>
        <div style={{marginTop:14,textAlign:"center"}}>
          <div style={{fontSize:13,color:C.lm,marginBottom:8}}>Hoe tevreden was je met deze tool of heb je nog opmerkingen?</div>
          <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>{setShowFeedbackModal(true);setFeedbackStars(0);setFeedbackText("");setFeedbackSent(false);}} variant="soft" style={{fontSize:13,padding:"8px 18px"}}>Deel feedback</Btn>
            <Btn onClick={()=>setPage("home")} variant="outline" style={{fontSize:13,padding:"8px 18px"}}>Terug naar home</Btn>
          </div>
        </div>

        {/* Feedback popup */}
        {showFeedbackModal&&(
          <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowFeedbackModal(false)}>
            <div style={{background:C.lc,borderRadius:20,border:`1px solid ${C.lb}`,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxWidth:400,width:"100%",padding:"24px 26px",position:"relative"}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setShowFeedbackModal(false)} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:8,border:"none",background:C.lb,color:C.lm,fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}} aria-label="Sluiten">×</button>
              <h3 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:C.lt,fontFamily:F}}>Deel je feedback</h3>
              <p style={{margin:"0 0 18px",fontSize:13,color:C.lm}}>Hoe tevreden ben je met NettoSim?</p>
              {!feedbackSent?(
                <>
                  <div style={{display:"flex",gap:6,marginBottom:20}} onMouseLeave={()=>setFeedbackHover(0)}>
                    {[1,2,3,4,5].map(i=>{
                      const active=i<=(feedbackHover||feedbackStars);
                      return (
                        <button key={i} type="button" onClick={()=>setFeedbackStars(i)} onMouseEnter={()=>setFeedbackHover(i)} style={{border:"none",background:"none",padding:4,cursor:"pointer",fontSize:28,lineHeight:1,color:active?C.amber:C.lb,transition:"color 0.15s"}} aria-label={`${i} sterren`}>
                          {active?"★":"☆"}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{marginBottom:18}}>
                    <label style={{display:"block",fontSize:12,fontWeight:600,color:C.lm,marginBottom:6}}>Wat wil je kwijt? (optioneel)</label>
                    <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="Tip, opmerking of verbeteridee..." rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.lb}`,fontSize:13,fontFamily:F,outline:"none",resize:"vertical",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/>
                  </div>
                  <Btn onClick={()=>{setFeedbackSent(true);}} style={{width:"100%",padding:"12px 20px"}}>Verstuur</Btn>
                </>
              ):(
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:36,marginBottom:8}}>✓</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.green}}>Bedankt voor je feedback!</div>
                  <div style={{fontSize:13,color:C.lm,marginTop:4}}>We nemen je input mee.</div>
                  <Btn onClick={()=>setShowFeedbackModal(false)} variant="outline" style={{marginTop:16}}>Sluiten</Btn>
                </div>
              )}
            </div>
          </div>
        )}
      </div>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════
// ABOUT — Missie, Waarom, Team
// ═══════════════════════════════════════════════════════════
function AboutPage({setPage,goContact,user}){const w=useW();const mob=w<768;return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}><Nav page="about" setPage={setPage} goContact={goContact} user={user}/><div style={{maxWidth:800,margin:"0 auto",padding:mob?"90px 20px 60px":"120px 24px 80px"}}><div style={{marginBottom:44}}><div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5}}>Over ons</div><h1 style={{fontSize:mob?28:40,fontWeight:900,color:C.lt,margin:"0 0 14px"}}>Wij maken belasting <span style={{color:C.primary}}>begrijpelijk</span></h1><p style={{fontSize:16,color:C.lm,lineHeight:1.8,margin:0}}>NettoSim is gebouwd vanuit de overtuiging dat iedereen recht heeft op helder financieel inzicht — zonder jargon, zonder kosten.</p></div>
  <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:mob?"22px":"28px 32px",marginBottom:24}}><h2 style={{fontSize:20,fontWeight:800,color:C.lt,margin:"0 0 14px"}}>🎯 Missie & Visie</h2><div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:20}}><div><h3 style={{fontSize:15,fontWeight:700,color:C.primary,margin:"0 0 6px"}}>Onze missie</h3><p style={{fontSize:14,color:C.lm,lineHeight:1.7,margin:0}}>Het Nederlandse belastingstelsel transparant en toegankelijk maken voor elke Nederlander.</p></div><div><h3 style={{fontSize:15,fontWeight:700,color:C.primary,margin:"0 0 6px"}}>Onze visie</h3><p style={{fontSize:14,color:C.lm,lineHeight:1.7,margin:0}}>Een wereld waarin financiële beslissingen niet worden gehinderd door complexiteit.</p></div></div></div>
  <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:mob?"22px":"28px 32px",marginBottom:24}}><h2 style={{fontSize:20,fontWeight:800,color:C.lt,margin:"0 0 14px"}}>💡 Waarom wij dit bouwen</h2><p style={{fontSize:14,color:C.lm,lineHeight:1.8,margin:"0 0 16px"}}>Het Nederlandse belastingstelsel telt meer dan 14 regelingen die op complexe manieren interacteren. De toeslagenval en verborgen afbouwpercentages maken het onmogelijk om impact te overzien zonder hulpmiddelen.</p><div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>{[{n:"80%",d:"begrijpt aanslag niet volledig"},{n:"€2.400",d:"misgelopen toeslagen per huishouden"},{n:"14",d:"regelingen in één overzicht"}].map((s,i)=><div key={i} style={{textAlign:"center",padding:14,background:C.bg,borderRadius:12}}><div style={{fontSize:26,fontWeight:900,color:C.primary,fontFamily:M}}>{s.n}</div><div style={{fontSize:11,color:C.lm,marginTop:4}}>{s.d}</div></div>)}</div></div>
  <div style={{marginBottom:28}}><h2 style={{fontSize:20,fontWeight:800,color:C.lt,margin:"0 0 20px"}}>👥 Ons team</h2><div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:14}}>{[{name:"Lars de Vries",role:"Oprichter",bio:"Voormalig belastingadviseur.",av:"👨‍💼"},{name:"Sophie Bakker",role:"Lead Dev",bio:"Full-stack & data-viz.",av:"👩‍💻"},{name:"Thomas Jansen",role:"Fiscalist",bio:"Registerbelastingadviseur.",av:"👨‍⚖️"},{name:"Emma Visser",role:"UX Design",bio:"Voorheen bij ING.",av:"👩‍🎨"}].map((t,i)=><div key={i} style={{background:C.lc,borderRadius:14,border:`1px solid ${C.lb}`,padding:"20px 16px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:8}}>{t.av}</div><div style={{fontSize:14,fontWeight:700,color:C.lt}}>{t.name}</div><div style={{fontSize:11,fontWeight:600,color:C.primary,marginBottom:4}}>{t.role}</div><div style={{fontSize:11,color:C.lm}}>{t.bio}</div></div>)}</div></div>
  <div style={{marginTop:28,textAlign:"center"}}><Btn onClick={()=>setPage("app")}>Naar de Simulator →</Btn></div></div></div>;}

// ═══════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════
function FaqPage({setPage,goContact,user}){const w=useW();const mob=w<768;const[open,setOpen]=useState(null);const faqs=[{q:"Hoe nauwkeurig is NettoSim?",a:"We gebruiken officiële tarieven 2025. Box 2/3 en bijzondere situaties zijn niet meegenomen."},{q:"Kan ik loondienst en ZZP combineren?",a:"Ja! Vul beide in. Gecombineerde belasting incl. aftrekposten wordt automatisch berekend."},{q:"Wat is het marginale tarief?",a:"Hoeveel belasting over de laatst verdiende euro. Kan oplopen tot 60-80% door afbouw kortingen/toeslagen."},{q:"Worden mijn gegevens opgeslagen?",a:"Nee. Alles draait lokaal in uw browser. Niets wordt verstuurd."},{q:"Wat is de toeslagenval?",a:"Meer verdienen → minder toeslagen. Het netto effect kan veel kleiner zijn dan verwacht."},{q:"Welke regelingen ontbreken?",a:"Box 2/3, WW/WIA, alimentatie, lijfrente, gemeentelijke toeslagen, vermogensgrenzen."}];
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}><Nav page="faq" setPage={setPage} goContact={goContact} user={user}/><div style={{maxWidth:720,margin:"0 auto",padding:mob?"90px 20px 60px":"120px 24px 80px"}}><div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5}}>Ondersteuning</div><h1 style={{fontSize:mob?28:40,fontWeight:900,color:C.lt,margin:"0 0 28px"}}>Veelgestelde <span style={{color:C.primary}}>vragen</span></h1>
  {faqs.map((f,i)=><div key={i} style={{background:C.lc,borderRadius:12,border:`1px solid ${C.lb}`,marginBottom:8,overflow:"hidden"}}><div onClick={()=>setOpen(open===i?null:i)} style={{padding:"14px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,color:C.lt,flex:1}}>{f.q}</span><span style={{fontSize:18,color:C.primary,flexShrink:0,marginLeft:12,transition:"transform 0.2s",transform:open===i?"rotate(45deg)":"rotate(0)"}}>+</span></div>{open===i&&<div style={{padding:"0 18px 14px",fontSize:14,color:C.lm,lineHeight:1.7}}>{f.a}</div>}</div>)}
  <div style={{marginTop:28,padding:"18px 22px",background:C.dark,borderRadius:14}}><h3 style={{fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 6px"}}>Vraag niet beantwoord?</h3><p style={{fontSize:13,color:C.muted,margin:0}}>Mail naar <span style={{color:C.primary}}>info@nettosim.nl</span> of gebruik ons <span style={{color:C.primary,cursor:"pointer",textDecoration:"underline"}} onClick={()=>setPage("contact")}>contactformulier</span></p></div></div></div>;}

// ═══════════════════════════════════════════════════════════
// PARTNERS
// ═══════════════════════════════════════════════════════════
function PartnersPage({setPage,goContact,user}){const w=useW();const mob=w<768;const[region,setRegion]=useState("Alle");
  const partners=[{name:"Van der Berg Belastingadviseurs",logo:"🏛️",desc:"Fiscaal advies voor ZZP'ers en MKB.",region:"Noord-Holland",type:"Belastingadvies"},{name:"FinPlan Amsterdam",logo:"📊",desc:"Onafhankelijk financieel planners.",region:"Noord-Holland",type:"Financiële planning"},{name:"Kuijpers & Co",logo:"📋",desc:"Accountancy voor ondernemers.",region:"Utrecht",type:"Accountancy"},{name:"Hypotheek Centrum Zuid",logo:"🏡",desc:"Hypotheekadvies op maat.",region:"Brabant",type:"Hypotheekadvies"},{name:"De Zaak Administratie",logo:"💼",desc:"Boekhouding voor ZZP'ers.",region:"Zuid-Holland",type:"Administratie"},{name:"Pension Advies Groep",logo:"🎯",desc:"Pensioenspecialisten.",region:"Gelderland",type:"Pensioenadvies"},{name:"StartUp Finance",logo:"🚀",desc:"Financieel advies voor starters.",region:"Zuid-Holland",type:"Startup advies"},{name:"Oost-NL Belastingen",logo:"⚖️",desc:"Regionaal belastingkantoor.",region:"Overijssel",type:"Belastingadvies"}];
  const filtered=region==="Alle"?partners:partners.filter(p=>p.region===region);
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}><Nav page="partners" setPage={setPage} goContact={goContact} user={user}/><div style={{maxWidth:960,margin:"0 auto",padding:mob?"90px 20px 60px":"120px 24px 80px"}}>
    <div style={{marginBottom:36}}>
      <div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5}}>Netwerk</div>
      <h1 style={{fontSize:mob?28:40,fontWeight:900,color:C.lt,margin:"0 0 12px"}}>Vind een <span style={{color:C.primary}}>specialist</span> bij jou in de buurt</h1>
      <p style={{fontSize:15,color:C.lm,lineHeight:1.7,margin:"0 0 10px",maxWidth:560}}>Erkende adviseurs door heel Nederland voor persoonlijk advies op maat.</p>
      <div onClick={()=>goContact("Partner worden bij NettoSim")} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:999,background:C.primarySoft,border:`1px solid ${C.primary}30`,fontSize:12,color:C.lt,cursor:"pointer"}}>
        <span style={{fontWeight:700,color:C.primary}}>Partner worden?</span>
        <span style={{color:C.lm}}>Sluit je aan bij het NettoSim netwerk.</span>
      </div>
    </div>
    <div style={{marginBottom:24}}><div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:6}}>Filter op regio</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Alle",...PROVS.slice(0,6)].map(r=><div key={r} onClick={()=>setRegion(r)} style={{padding:"5px 14px",borderRadius:50,fontSize:12,fontWeight:600,cursor:"pointer",background:region===r?C.primary:C.lc,color:region===r?"#fff":C.lt,border:`1px solid ${region===r?C.primary:C.lb}`}}>{r}</div>)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14,marginBottom:40}}>{filtered.map((p,i)=><div key={i} style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:"22px",display:"flex",flexDirection:"column"}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}><div style={{width:44,height:44,borderRadius:11,background:C.primarySoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{p.logo}</div><div><div style={{fontSize:15,fontWeight:700,color:C.lt}}>{p.name}</div><div style={{fontSize:12,color:C.primary,fontWeight:600}}>{p.type}</div></div></div><p style={{fontSize:13,color:C.lm,lineHeight:1.5,margin:"0 0 12px",flex:1}}>{p.desc}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:C.lm,background:"#f5f7fa",padding:"3px 10px",borderRadius:50}}>📍 {p.region}</span><Btn onClick={()=>goContact()} style={{padding:"6px 14px",fontSize:11,borderRadius:8}}>Neem contact op</Btn></div></div>)}</div>
    <div style={{background:`linear-gradient(135deg,${C.dark},#0f1f3a)`,borderRadius:20,padding:mob?"28px 22px":"44px 36px",textAlign:"center"}}><h2 style={{fontSize:mob?22:28,fontWeight:900,color:"#fff",margin:"0 0 10px"}}>Word partner van NettoSim</h2><p style={{fontSize:14,color:C.muted,margin:"0 auto 24px",maxWidth:460}}>Bereik duizenden Nederlanders die actief bezig zijn met financiële planning.</p><Btn onClick={()=>setPage("contact")}>Word partner →</Btn></div>
  </div></div>;}

// ═══════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════
function ContactPage({setPage,goContact,initialSubject,user}){const w=useW();const mob=w<768;const[sent,setSent]=useState(false);const[name,setName]=useState("");const[email,setEmail]=useState("");const[subject,setSubject]=useState(initialSubject||"");const[message,setMessage]=useState("");
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}><Nav page="contact" setPage={setPage} goContact={goContact} user={user}/><div style={{maxWidth:800,margin:"0 auto",padding:mob?"90px 20px 60px":"120px 24px 80px"}}><div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:36}}>
    <div><div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5}}>Contact</div><h1 style={{fontSize:mob?28:34,fontWeight:900,color:C.lt,margin:"0 0 14px"}}>Neem contact op</h1><p style={{fontSize:14,color:C.lm,lineHeight:1.7,margin:"0 0 24px"}}>Vraag, suggestie of samenwerking? We horen graag van je.</p>
      {[{ic:"✉️",l:"E-mail",v:"info@nettosim.nl"},{ic:"📍",l:"Locatie",v:"Amsterdam, NL"},{ic:"⏰",l:"Reactietijd",v:"Binnen 24 uur"}].map((c,i)=><div key={i} style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}><div style={{width:38,height:38,borderRadius:10,background:C.primarySoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{c.ic}</div><div><div style={{fontSize:11,color:C.lm,fontWeight:600}}>{c.l}</div><div style={{fontSize:14,fontWeight:600,color:C.lt}}>{c.v}</div></div></div>)}</div>
    <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:"24px"}}>{sent?<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:44,marginBottom:14}}>✅</div><h3 style={{fontSize:18,fontWeight:800,color:C.lt,margin:"0 0 6px"}}>Verzonden!</h3><p style={{fontSize:13,color:C.lm}}>We nemen snel contact op.</p></div>:<>
      <h3 style={{fontSize:17,fontWeight:800,color:C.lt,margin:"0 0 18px"}}>Stuur een bericht</h3>
      <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:3}}>Naam</div><input value={name} onChange={e=>setName(e.target.value)} placeholder="Je volledige naam" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:14,fontFamily:F,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/></div>
      <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:3}}>E-mail</div><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:14,fontFamily:F,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/></div>
      <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:3}}>Onderwerp</div><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Waar gaat het over?" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:14,fontFamily:F,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/></div>
      <div style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:C.lm,marginBottom:3}}>Bericht</div><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Typ je bericht..." rows={4} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:14,fontFamily:F,outline:"none",resize:"vertical",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.lb}/></div>
      <Btn onClick={()=>setSent(true)} style={{width:"100%"}}>Verstuur bericht</Btn></>}</div>
  </div></div></div>;}

// ═══════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════
// ─── User (login) persistence ─────────────────────────────
const USER_KEY="nettosim_user";
const PROFILE_KEY=(id)=>`nettosim_profile_${id}`;
const MOMENTS_KEY=(id)=>`nettosim_moments_${id}`;
const SAVED_SCENARIO_KEY=(id)=>`nettosim_saved_${id}`;
function loadUser(){try{const s=localStorage.getItem(USER_KEY);return s?JSON.parse(s):null;}catch{return null;}}
function saveUser(u){try{if(u)localStorage.setItem(USER_KEY,JSON.stringify(u));else localStorage.removeItem(USER_KEY);}catch{}}
function loadMoments(id){try{const s=localStorage.getItem(MOMENTS_KEY(id));return s?JSON.parse(s):[];}catch{return [];}}
function saveMoments(id,m){try{localStorage.setItem(MOMENTS_KEY(id),JSON.stringify(m));}catch{}}
function loadSavedScenario(id){try{const s=localStorage.getItem(SAVED_SCENARIO_KEY(id));return s?JSON.parse(s):null;}catch{return null;}}
function saveSavedScenario(id,data){try{localStorage.setItem(SAVED_SCENARIO_KEY(id),JSON.stringify(data));}catch{}}
function loadProfile(id){try{const s=localStorage.getItem(PROFILE_KEY(id));return s?JSON.parse(s):{};}catch{return {};}}
function saveProfile(id,data){try{localStorage.setItem(PROFILE_KEY(id),JSON.stringify(data));}catch{}}

// ═══════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════
function LoginPage({setPage,setUser}){
  const w=useW();const mob=w<768;
  const handleGuest=()=>{
    const u={id:"guest-"+Date.now(),name:"Gast"};
    setUser(u);saveUser(u);setPage("home");
  };
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}>
    <Nav page="login" setPage={setPage} goContact={()=>setPage("contact")} user={null}/>
    <div style={{maxWidth:420,margin:"0 auto",padding:mob?"100px 20px 60px":"120px 24px 80px"}}>
      <div style={{background:C.lc,borderRadius:20,border:`1px solid ${C.lb}`,padding:mob?"28px 22px":"36px 32px",boxShadow:"0 10px 40px rgba(0,0,0,0.06)"}}>
        <h1 style={{fontSize:mob?24:28,fontWeight:900,color:C.lt,margin:"0 0 8px",fontFamily:F}}>Inloggen</h1>
        <p style={{fontSize:14,color:C.lm,marginBottom:24,lineHeight:1.6}}>Log in om je gegevens en levensmomenten op te slaan en overal terug te zien.</p>
        <Btn onClick={handleGuest} style={{width:"100%",padding:"14px 20px",marginBottom:16}}>Doorgaan zonder account</Btn>
        <p style={{fontSize:12,color:C.lm,textAlign:"center",marginBottom:14}}>Of log in met</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {[{label:"Google",icon:"G"},{label:"Microsoft",icon:"M"},{label:"Apple",icon:"A"}].map((p,i)=>(
            <button key={i} disabled style={{padding:"12px 20px",borderRadius:12,border:`1.5px solid ${C.lb}`,background:C.lc,color:C.lm,fontSize:13,fontWeight:600,cursor:"not-allowed"}}>{p.label}</button>
          ))}
        </div>
        <p style={{fontSize:11,color:C.lm,textAlign:"center",marginTop:12}}>Inloggen met Google, Microsoft en Apple komt later.</p>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════
// PROFILE PAGE — saved info + life moments
// ═══════════════════════════════════════════════════════════
function ProfilePage({setPage,goContact,user,setUser}){
  const w=useW();const mob=w<768;
  const[displayName,setDisplayName]=useState("");
  const[moments,setMoments]=useState([]);
  const[savedScenario,setSavedScenario]=useState(null);
  const[newDate,setNewDate]=useState("");
  const[newTitle,setNewTitle]=useState("");
  const[newDesc,setNewDesc]=useState("");
  useEffect(()=>{if(!user)return;const p=loadProfile(user.id);setDisplayName(p.displayName||"");setMoments(loadMoments(user.id));setSavedScenario(loadSavedScenario(user.id));},[user]);
  const saveDisplayName=()=>{if(user)saveProfile(user.id,{...loadProfile(user.id),displayName:displayName.trim()});};
  const addMoment=()=>{if(!newTitle.trim())return;const m={id:Date.now(),date:newDate||new Date().toISOString().slice(0,10),title:newTitle.trim(),description:newDesc.trim()};const next=[m,...moments];setMoments(next);saveMoments(user.id,next);setNewDate("");setNewTitle("");setNewDesc("");};
  const removeMoment=(id)=>{const next=moments.filter(x=>x.id!==id);setMoments(next);saveMoments(user.id,next);};
  const logout=()=>{setUser(null);saveUser(null);setPage("home");};
  if(!user)return null;
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:F}}>
    <Nav page="profile" setPage={setPage} goContact={goContact} user={user} onLogout={logout}/>
    <div style={{maxWidth:720,margin:"0 auto",padding:mob?"90px 20px 60px":"100px 24px 80px"}}>
      <div style={{marginBottom:32}}>
        <h1 style={{fontSize:mob?26:32,fontWeight:900,color:C.lt,margin:"0 0 8px"}}>Mijn profiel</h1>
        <p style={{fontSize:14,color:C.lm}}>Bewaar je gegevens en levensmomenten om je situatie te volgen.</p>
      </div>
      <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:"24px",marginBottom:20}}>
        <h2 style={{fontSize:16,fontWeight:800,color:C.lt,margin:"0 0 14px"}}>Mijn gegevens</h2>
        <div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:600,color:C.lm,display:"block",marginBottom:4}}>Weergavenaam (optioneel)</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} onBlur={saveDisplayName} placeholder="Bijv. Jan" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.lb}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
        <p style={{fontSize:12,color:C.lm}}>Je gegevens worden alleen lokaal op je apparaat opgeslagen.</p>
      </div>
      <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:"24px",marginBottom:20}}>
        <h2 style={{fontSize:16,fontWeight:800,color:C.lt,margin:"0 0 14px"}}>Levensmomenten</h2>
        <p style={{fontSize:13,color:C.lm,marginBottom:16}}>Noteer momenten waarop er iets veranderde (nieuwe baan, verhuizing, etc.) om het overzicht te bewaren.</p>
        <div style={{display:"grid",gap:8,marginBottom:16}}>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:13,outline:"none"}}/>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Titel (bijv. Salarisverhoging)" style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:13,outline:"none"}}/>
          <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Korte omschrijving (optioneel)" style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.lb}`,fontSize:13,outline:"none"}}/>
          <Btn onClick={addMoment} variant="soft" style={{alignSelf:"start"}}>Moment toevoegen</Btn>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {moments.length===0?<p style={{fontSize:13,color:C.lm}}>Nog geen momenten. Voeg er een toe.</p>:moments.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"12px 14px",background:C.bg,borderRadius:10,border:`1px solid ${C.lb}`}}>
              <div><div style={{fontSize:13,fontWeight:700,color:C.lt}}>{m.title}</div><div style={{fontSize:12,color:C.lm}}>{m.date}{m.description?" · "+m.description:""}</div></div>
              <button onClick={()=>removeMoment(m.id)} style={{border:"none",background:"none",color:C.lm,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Verwijderen</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:C.lc,borderRadius:16,border:`1px solid ${C.lb}`,padding:"24px",marginBottom:20}}>
        <h2 style={{fontSize:16,fontWeight:800,color:C.lt,margin:"0 0 14px"}}>Opgeslagen situatie</h2>
        {savedScenario?<p style={{fontSize:13,color:C.lm,marginBottom:12}}>Je hebt een situatie opgeslagen vanuit de simulator.</p>:<p style={{fontSize:13,color:C.lm,marginBottom:12}}>Geen opgeslagen situatie. Ga naar Berekenen en sla je huidige of nieuwe situatie op.</p>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>setPage("app")} variant="soft">Naar Berekenen</Btn>
          {savedScenario&&<Btn onClick={()=>setPage("app")}>Open in simulator</Btn>}
        </div>
      </div>
      <div style={{marginTop:24}}><Btn onClick={logout} variant="outline">Uitloggen</Btn></div>
    </div>
  </div>;
}

export default function App(){
  const[page,setPage]=useState("home");
  const[contactSubject,setContactSubject]=useState("");
  const[user,setUser]=useState(()=>loadUser());
  const goContact=(subject="")=>{setContactSubject(subject);setPage("contact");};
  useEffect(()=>{window.scrollTo(0,0);},[page]);
  return <>
    <link href={FURL} rel="stylesheet"/>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{overflow-x:hidden}button,select{font-family:${F}}::selection{background:${C.primary}25}textarea{font-family:${F}}input:focus,select:focus{border-color:${C.primary}!important}`}</style>
    {page==="home"&&<Landing setPage={setPage} goContact={goContact} user={user}/>}
    {page==="app"&&<SimPage setPage={setPage} goContact={goContact} user={user} onSaveScenario={user?((data)=>saveSavedScenario(user.id,data)):null} loadSavedScenario={user?(()=>loadSavedScenario(user.id)):null}/>}
    {page==="about"&&<AboutPage setPage={setPage} goContact={goContact} user={user}/>}
    {page==="partners"&&<PartnersPage setPage={setPage} goContact={goContact} user={user}/>}
    {page==="faq"&&<FaqPage setPage={setPage} goContact={goContact} user={user}/>}
    {page==="contact"&&<ContactPage setPage={setPage} goContact={goContact} initialSubject={contactSubject} user={user}/>}
    {page==="login"&&<LoginPage setPage={setPage} setUser={setUser}/>}
    {page==="profile"&&user&&<ProfilePage setPage={setPage} goContact={goContact} user={user} setUser={setUser}/>}
  </>;
}
