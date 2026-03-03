export function buildPdfData({ rC, rN, diff, C }) {
  const totalTax = (r) => (r.tTx || 0) + (r.box2?.tax || 0) + (r.b3?.tax || 0);

  return {
    brand: {
      name: "NettoSim",
      logoText: "€",
      tagline: "Inzicht in netto, belasting en toeslagen",
      colors: {
        primary: C.primary,
        green: C.green,
        red: C.red,
        lt: C.lt,
        lm: C.lm,
        lb: C.lb,
      },
    },
    meta: {
      title: "Resultatenrapport",
      date: new Date().toLocaleDateString("nl-NL"),
      scenario: "Nieuw scenario vs huidig",
    },
    current: {
      mo: rC.mo,
      gT: rC.gT,
      tC: rC.tC,
      tT: rC.tT,
      eR: rC.eR,
      tTx: rC.tTx,
      box2Tax: rC.box2?.tax || 0,
      box3Tax: rC.b3?.tax || 0,
      nI: rC.nI,
    },
    next: {
      mo: rN.mo,
      gT: rN.gT,
      tC: rN.tC,
      tT: rN.tT,
      eR: rN.eR,
      tTx: rN.tTx,
      box2Tax: rN.box2?.tax || 0,
      box3Tax: rN.b3?.tax || 0,
      nI: rN.nI,
    },
    diff: {
      year: diff,
      month: diff / 12,
    },
    breakdownRows: [
      { label: "Bruto inkomen", value: rN.gT },
      { label: "Belasting totaal", value: -totalTax(rN) },
      { label: "Heffingskortingen", value: rN.tC },
      { label: "Toeslagen", value: rN.tT },
      { label: "Hypotheekvoordeel", value: rN.hy?.nt || 0 },
      { label: "Zvw/DUO/Gemeente", value: -((rN.zv || 0) + (rN.du || 0) + (rN.gem?.totaal || 0)) },
    ],
  };
}

