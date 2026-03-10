import { useState } from "react";
import { C } from "../constants/theme.js";
import { PROVS } from "../constants/provinces.js";
import { B3_V } from "../lib/taxEngine.js";
import Btn from "./ui/Btn.jsx";
import Sl from "./ui/Slider.jsx";
import Tg from "./ui/Toggle.jsx";
import NC from "./ui/NumberChips.jsx";
import Tip from "./ui/Tip.jsx";

export default function ScenarioForm({ s, onChange, label, color, mob, onLogEvent }) {
  const u = (k, v) => {
    onChange({ ...s, [k]: v });
    if (onLogEvent) onLogEvent("input_change", { field: k, value: v });
  };
  const [showAdv, setShowAdv] = useState(false);
  const hasAdv =
    (s.box2Income || 0) > 0 ||
    (s.box3Spaargeld || 0) > 0 ||
    (s.box3Beleggingen || 0) > 0 ||
    (s.wwwiaIncome || 0) > 0 ||
    (s.alimentatieBetaald || 0) > 0 ||
    (s.alimentatieOntvangen || 0) > 0 ||
    (s.lijfrentePremie || 0) > 0;
  const Divider = ({ children }) => (
    <div
      style={{
        margin: "18px 0 12px",
        paddingTop: 14,
        borderTop: `1px solid ${C.lb}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: C.lt }}>{children}</span>
    </div>
  );

  return (
    <div
      style={{
        background: C.lc,
        borderRadius: 16,
        border: `1.5px solid ${color}25`,
        padding: mob ? "18px" : "24px 28px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}88)` }} />
      <h3 style={{ fontSize: 16, fontWeight: 800, color, margin: "0 0 20px" }}>{label}</h3>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.lm }}>
            Provincie
            <Tip id="provincie" />
          </span>
        </div>
        <select
          value={s.provincie || "Noord-Holland"}
          onChange={(e) => u("provincie", e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: `1.5px solid ${C.lb}`,
            fontSize: 14,
            fontFamily: "inherit",
            color: C.lt,
            background: C.lc,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {PROVS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <Divider>💰 Inkomen uit arbeid</Divider>
      <Sl label="Bruto jaarsalaris (loondienst)" value={s.employment} onChange={(v) => u("employment", v)} info="employment" />
      <Sl label="Winst uit onderneming / ZZP" value={s.zzpIncome} onChange={(v) => u("zzpIncome", v)} info="zzpIncome" />
      {s.zzpIncome > 0 && (
        <div style={{ marginLeft: 8, marginBottom: 8, paddingLeft: 14, borderLeft: `2px solid ${C.purple}30` }}>
          <Tg label="Urencriterium (1.225+ uur)" checked={s.urenOK} onChange={(v) => u("urenOK", v)} info="urenOK" />
          <Tg label="Startersaftrek (eerste 5 jaar)" checked={s.isStarter} onChange={(v) => u("isStarter", v)} info="isStarter" />
        </div>
      )}
      <Sl label="WW / WIA uitkering" value={s.wwwiaIncome || 0} onChange={(v) => u("wwwiaIncome", v)} info="wwwiaIncome" />

      <Divider>👤 Persoonlijke situatie</Divider>
      <Tg
        label="Partner / samenwonend"
        checked={s.hasPartner}
        onChange={(v) => {
          u("hasPartner", v);
          if (!v) u("inc2", 0);
        }}
        info="hasPartner"
      />
      {s.hasPartner && <Sl label="Partner bruto jaarsalaris" value={s.inc2} onChange={(v) => u("inc2", v)} info="inc2" />}
      {s.employment > 0 && (
        <Sl
          label="Pensioenpremie"
          value={s.pensioenPerc}
          onChange={(v) => u("pensioenPerc", v)}
          min={0}
          max={15}
          step={0.5}
          pre=""
          suf="% van bruto"
          info="pensioenPerc"
        />
      )}
      <Tg label="Kinderen (<18 jaar)" checked={s.hasKids} onChange={(v) => u("hasKids", v)} info="hasKids" />
      {s.hasKids && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <NC label="Aantal" value={s.nKids} onChange={(v) => u("nKids", v)} options={[1, 2, 3, 4]} />
          <NC label="Onder 12" value={s.kidsU12} onChange={(v) => u("kidsU12", v)} options={Array.from({ length: s.nKids + 1 }, (_, i) => i)} />
          <NC label="In opvang" value={s.nKidsOpvang} onChange={(v) => u("nKidsOpvang", v)} options={Array.from({ length: s.nKids + 1 }, (_, i) => i)} />
        </div>
      )}
      {s.hasKids && s.nKidsOpvang > 0 && (
        <div style={{ marginLeft: 8 }}>
          <Sl label="Uurtarief opvang" value={s.kotUur} onChange={(v) => u("kotUur", v)} min={5} max={15} step={0.25} pre="€" />
          <Sl label="Uren opvang/maand" value={s.kotUren} onChange={(v) => u("kotUren", v)} min={20} max={230} step={10} pre="" />
        </div>
      )}

      <Divider>🏠 Woonsituatie</Divider>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { k: "r", l: "🏢 Huur", a: s.isRenter },
          { k: "o", l: "🏡 Koop", a: s.hasHome },
          { k: "n", l: "🏠 Anders", a: !s.isRenter && !s.hasHome },
        ].map((o) => (
          <div
            key={o.k}
            onClick={() => {
              if (o.k === "r") onChange({ ...s, isRenter: true, hasHome: false });
              else if (o.k === "o") onChange({ ...s, isRenter: false, hasHome: true });
              else onChange({ ...s, isRenter: false, hasHome: false });
            }}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              textAlign: "center",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
              userSelect: "none",
              background: o.a ? C.primarySoft : "#f8f9fb",
              border: `1.5px solid ${o.a ? C.primary + "40" : "#e8eaee"}`,
              color: o.a ? C.primary : C.lm,
            }}
          >
            {o.l}
          </div>
        ))}
      </div>
      {s.isRenter && <Sl label="Kale huur/maand" value={s.rent} onChange={(v) => u("rent", v)} min={0} max={1500} step={25} info="rent" />}
      {s.hasHome && (
        <>
          <Sl label="Hypotheek" value={s.hypotheek} onChange={(v) => u("hypotheek", v)} min={0} max={800000} step={5000} info="hypotheek" />
          <Sl label="Hypotheekrente" value={s.rentePerc} onChange={(v) => u("rentePerc", v)} min={1} max={6} step={0.1} pre="" suf="%" info="rentePerc" />
          <Sl label="WOZ-waarde" value={s.wozWaarde} onChange={(v) => u("wozWaarde", v)} min={100000} max={1000000} step={10000} info="wozWaarde" />
        </>
      )}

      <Divider>📋 Overige aftrekposten</Divider>
      <Tg label="AOW-leeftijd bereikt" checked={s.isAOW} onChange={(v) => u("isAOW", v)} info="isAOW" />
      <Sl label="DUO studieschuld" value={s.duoSchuld} onChange={(v) => u("duoSchuld", v)} min={0} max={100000} step={1000} info="duoSchuld" />
      <Sl label="Lijfrentepremie (jaarlijks)" value={s.lijfrentePremie || 0} onChange={(v) => u("lijfrentePremie", v)} min={0} max={40000} step={250} info="lijfrentePremie" />

      <div
        onClick={() => setShowAdv(!showAdv)}
        style={{
          margin: "18px 0 0",
          padding: "12px 16px",
          background: showAdv ? "#f8f9fb" : "#fafbfc",
          borderRadius: 10,
          border: `1.5px solid ${showAdv ? C.primary + "30" : C.lb}`,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: showAdv ? C.primary : C.lm }}>
          ⚙️ Geavanceerd: Box 2/3, alimentatie{hasAdv ? " (actief)" : ""}
        </span>
        <span style={{ fontSize: 12, color: C.lm, transition: "transform 0.2s", display: "inline-block", transform: showAdv ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      {showAdv && (
        <div style={{ padding: "16px 0 0" }}>
          <Divider>⚖️ Alimentatie</Divider>
          <Sl label="Partneralimentatie betaald/jaar" value={s.alimentatieBetaald || 0} onChange={(v) => u("alimentatieBetaald", v)} min={0} max={50000} step={500} info="alimentatieBetaald" />
          <Sl label="Partneralimentatie ontvangen/jaar" value={s.alimentatieOntvangen || 0} onChange={(v) => u("alimentatieOntvangen", v)} min={0} max={50000} step={500} info="alimentatieOntvangen" />
          <Divider>🏢 Box 2 — Aanmerkelijk belang</Divider>
          <Sl label="Dividend / AB-inkomen" value={s.box2Income || 0} onChange={(v) => u("box2Income", v)} min={0} max={500000} step={1000} info="box2Income" />
          <Divider>🏦 Box 3 — Vermogen</Divider>
          <Sl label="Spaargeld (banktegoeden)" value={s.box3Spaargeld || 0} onChange={(v) => u("box3Spaargeld", v)} min={0} max={2000000} step={5000} info="box3Spaargeld" />
          <Sl label="Beleggingen (aandelen, crypto, etc.)" value={s.box3Beleggingen || 0} onChange={(v) => u("box3Beleggingen", v)} min={0} max={2000000} step={5000} info="box3Beleggingen" />
          <Sl label="Schulden in Box 3" value={s.box3Schulden || 0} onChange={(v) => u("box3Schulden", v)} min={0} max={500000} step={1000} info="box3Schulden" />
          {((s.box3Spaargeld || 0) + (s.box3Beleggingen || 0)) > 0 && (
            <div style={{ padding: "10px 14px", background: C.primarySoft, borderRadius: 8, fontSize: 12, color: C.lt, lineHeight: 1.5, marginTop: 4 }}>
              <strong>Vermogen:</strong> €{((s.box3Spaargeld || 0) + (s.box3Beleggingen || 0) - (s.box3Schulden || 0)).toLocaleString("nl-NL")} netto
              <span style={{ color: C.lm }}> | Heffingsvrij: €{(s.hasPartner ? B3_V * 2 : B3_V).toLocaleString("nl-NL")}</span>
              <Tip id="vermogen" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
