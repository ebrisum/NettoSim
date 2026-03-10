import { C } from "../constants/theme.js";

export default function WF({ r }) {
  const items = [
    { l: "Bruto inkomen", v: r.gT, c: C.primary },
    ...(r.wwInc > 0 ? [{ l: "WW/WIA uitkering", v: r.wwInc, c: C.purple }] : []),
    ...(r.aliBij > 0 ? [{ l: "Alimentatie ontv.", v: r.aliBij, c: C.amber }] : []),
    ...(r.pn1 > 0 || r.pn2 > 0 ? [{ l: "Pensioenaftrek", v: -(r.pn1 + r.pn2), c: C.purple }] : []),
    ...(r.zi ? [{ l: "Ondernemersaftrek", v: -(r.zi.za + r.zi.sa + r.zi.mk), c: C.purple }] : []),
    ...(r.aliAf > 0 ? [{ l: "Alimentatie aftrek", v: -r.aliAf, c: C.green }] : []),
    ...(r.ljr?.aftrek > 0 ? [{ l: "Lijfrente aftrek", v: -r.ljr.aftrek, c: C.green }] : []),
    { l: "Box 1 belasting", v: -r.tTx, c: C.red },
    { l: "Heffingskortingen", v: r.tC, c: C.green },
    ...(r.box2?.tax > 0 ? [{ l: "Box 2 belasting", v: -r.box2.tax, c: C.red }] : []),
    ...(r.b3?.tax > 0 ? [{ l: "Box 3 belasting", v: -r.b3.tax, c: C.red }] : []),
    ...(r.tT > 0 ? [{ l: "Toeslagen & KB", v: r.tT, c: C.amber }] : []),
    ...(r.hy?.nt && r.hy.nt !== 0 ? [{ l: "Hypotheekvoordeel", v: r.hy.nt, c: C.purple }] : []),
    ...(r.zv > 0 ? [{ l: "Zvw-bijdrage", v: -r.zv, c: C.red }] : []),
    ...(r.ww?.totaal > 0 ? [{ l: "WW/WIA premie", v: -r.ww.totaal, c: C.red }] : []),
    ...(r.gem?.totaal > 0 ? [{ l: "Gem. heffingen", v: -r.gem.totaal, c: C.red }] : []),
    ...(r.du > 0 ? [{ l: "DUO-aflossing", v: -r.du, c: C.red }] : []),
  ];
  const mx = Math.max(r.gT, 1) * 1.05;
  return (
    <div style={{ padding: "16px 0" }}>
      {items.map((it, i) => {
        const bw = mx > 0 ? (Math.abs(it.v) / mx) * 100 : 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 110, fontSize: 12, color: C.lm, textAlign: "right", flexShrink: 0, fontWeight: 500 }}>
              {it.l}
            </div>
            <div style={{ flex: 1, height: 24, position: "relative", background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max(bw, 1)}%`,
                  height: "100%",
                  background: it.c + "20",
                  borderRadius: 6,
                  transition: "width 0.4s",
                  borderRight: `3px solid ${it.c}`,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 10,
                  top: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  color: it.v >= 0 ? C.lt : C.red,
                }}
              >
                {it.v >= 0 ? "+" : "-"}€{Math.round(Math.abs(it.v)).toLocaleString("nl-NL")}
              </span>
            </div>
          </div>
        );
      })}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          paddingTop: 12,
          borderTop: `2px solid ${C.green}30`,
        }}
      >
        <div style={{ width: 110, fontSize: 13, color: C.green, textAlign: "right", fontWeight: 700, flexShrink: 0 }}>
          = Netto
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.green }}>
          €{Math.round(r.nI).toLocaleString("nl-NL")}
        </span>
        <span style={{ fontSize: 13, color: C.lm, fontWeight: 500 }}>
          (€{Math.round(r.mo).toLocaleString("nl-NL")}/mnd)
        </span>
      </div>
      {r.vermBlock && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: C.amberSoft,
            borderRadius: 8,
            border: `1px solid ${C.amber}20`,
            fontSize: 12,
            color: C.amber,
            lineHeight: 1.5,
          }}
        >
          <strong>⚠ Vermogensgrens overschreden:</strong> Uw vermogen (€
          {Math.round(r.b3?.totVerm || 0).toLocaleString("nl-NL")}) overschrijdt de grens. Zorgtoeslag, huurtoeslag en
          kindgebonden budget vervallen.
        </div>
      )}
    </div>
  );
}
