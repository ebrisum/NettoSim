import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
} from "@react-pdf/renderer";

const makeStyles = (C) =>
  StyleSheet.create({
    page: {
      padding: 28,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: C.lt,
      backgroundColor: "#FFFFFF",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.lb,
    },
    brand: { flexDirection: "row", alignItems: "center" },
    logoBox: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    logoText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
    brandName: { fontSize: 14, fontWeight: "bold" },
    meta: { textAlign: "right" },
    metaSmall: { color: C.lm, fontSize: 9 },

    h1: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
    sub: { color: C.lm, marginBottom: 14, lineHeight: 1.4 },

    grid2: { flexDirection: "row" },
    col: { flex: 1, marginRight: 10 },

    kpiRow: { flexDirection: "row", marginBottom: 15 },
    kpi: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.lb,
      borderRadius: 12,
      padding: 12,
      backgroundColor: "#fff",
      marginRight: 10,
    },
    kpiLabel: { fontSize: 9, color: C.lm, marginBottom: 6 },
    kpiValue: { fontSize: 14, fontWeight: "bold" },

    sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8, marginTop: 12 },

    table: { borderWidth: 1, borderColor: C.lb, borderRadius: 12, overflow: "hidden" },
    trHead: { flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: C.lb },
    tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
    th: { padding: 8, fontSize: 9, fontWeight: "bold", color: C.lm },
    td: { padding: 8, fontSize: 9 },
    tdRight: { padding: 8, fontSize: 9, textAlign: "right" },
    tdMid: { padding: 8, fontSize: 9, textAlign: "center" },

    footer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.lb,
    },
    disclaimer: { fontSize: 8, color: C.lm, lineHeight: 1.4 },
  });

const fmtEur = (n) => `€${Math.round(Math.abs(n || 0)).toLocaleString("nl-NL")}`;
const fmtSignedEur = (n) => `${(n || 0) >= 0 ? "+" : "-"}${fmtEur(n)}`;

function MiniBarChart({ title, items, C }) {
  const W = 220;
  const H = 80;
  const pad = 10;
  const maxV = Math.max(...items.map((x) => Math.abs(x.value || 0)), 1);

  return (
    <View style={{ borderWidth: 1, borderColor: C.lb, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 8 }}>{title}</Text>
      <Svg width={W} height={H}>
        <Line x1={0} y1={H - pad} x2={W} y2={H - pad} stroke={C.lb} strokeWidth={1} />
        {items.map((it, i) => {
          const barW = 30;
          const x = 20 + i * (barW + 20);
          const h = (Math.abs(it.value || 0) / maxV) * (H - pad * 2);
          const y = H - pad - h;
          const fill = it.colorKey === "green" ? C.green : C.primary;
          return <Rect key={i} x={x} y={y} width={barW} height={h} rx={4} fill={fill} />;
        })}
      </Svg>
    </View>
  );
}

function WaterfallLite({ title, rows, totalLabel, totalValue, C }) {
  const W = 150;
  const maxV = Math.max(...rows.map((r) => Math.abs(r.value || 0)), Math.abs(totalValue || 0), 1);
  const scale = (v) => (Math.abs(v) / maxV) * W;

  return (
    <View style={{ borderWidth: 1, borderColor: C.lb, borderRadius: 12, padding: 12, marginTop: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 8 }}>{title}</Text>
      {rows.map((r, i) => {
        const isPos = (r.value || 0) >= 0;
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ width: 100, fontSize: 8 }}>{r.label}</Text>
            <Svg width={W} height={12}>
              <Rect x={0} y={2} width={scale(r.value)} height={8} rx={4} fill={isPos ? C.green : C.red} />
            </Svg>
            <Text style={{ flex: 1, textAlign: "right", fontSize: 8 }}>{fmtSignedEur(r.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ResultsReportPDF({ data }) {
  const C = data?.brand?.colors || {
    primary: "#0077CC", green: "#16a34a", red: "#dc2626", lt: "#0f172a", lm: "#475569", lb: "#e2e5ea"
  };
  const S = makeStyles(C);
  const cur = data?.current || {};
  const nxt = data?.next || {};
  const diff = data?.diff || {};
  const totalTax = (r) => (r.tTx || 0) + (r.box2Tax || 0) + (r.box3Tax || 0);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header restored */}
        <View style={S.header}>
          <View style={S.brand}>
            <View style={S.logoBox}><Text style={S.logoText}>{data?.brand?.logoText || "€"}</Text></View>
            <View>
              <Text style={S.brandName}>{data?.brand?.name || "NettoSim"}</Text>
              <Text style={S.metaSmall}>{data?.brand?.tagline || "Inzicht in netto"}</Text>
            </View>
          </View>
          <View style={S.meta}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>{data?.meta?.title || "Resultatenrapport"}</Text>
            <Text style={S.metaSmall}>{data?.meta?.date || ""}</Text>
          </View>
        </View>

        <Text style={S.h1}>Overzicht nieuw scenario versus huidig</Text>
        <Text style={S.sub}>Bedragen zijn indicatief en gebaseerd op jouw invoer.</Text>

        {/* KPI Row Restored */}
        <View style={S.kpiRow}>
          <View style={S.kpi}>
            <Text style={S.kpiLabel}>Netto verschil per jaar</Text>
            <Text style={[S.kpiValue, { color: diff.year >= 0 ? C.green : C.red }]}>{fmtSignedEur(diff.year)}</Text>
            <Text style={{ fontSize: 8, marginTop: 4 }}>{fmtSignedEur(diff.month)} p/m</Text>
          </View>
          <View style={S.kpi}>
            <Text style={S.kpiLabel}>Toeslagen verschil</Text>
            <Text style={[S.kpiValue, { color: (nxt.tT - cur.tT) >= 0 ? C.green : C.red }]}>{fmtSignedEur(nxt.tT - cur.tT)}</Text>
          </View>
          <View style={[S.kpi, { marginRight: 0 }]}>
            <Text style={S.kpiLabel}>Effectief tarief</Text>
            <Text style={[S.kpiValue, { color: C.primary }]}>{((nxt.eR || 0) * 100).toFixed(1)}%</Text>
          </View>
        </View>

        {/* Full Comparison Table Restored */}
        <Text style={S.sectionTitle}>Vergelijking kerncijfers</Text>
        <View style={S.table}>
          <View style={S.trHead}>
            <Text style={[S.th, { flex: 1.4 }]}>Onderdeel</Text>
            <Text style={[S.th, { flex: 1, textAlign: "right" }]}>Huidig</Text>
            <Text style={[S.th, { flex: 0.8, textAlign: "center" }]}>Verschil</Text>
            <Text style={[S.th, { flex: 1, textAlign: "right" }]}>Nieuw</Text>
          </View>
          {[
            { l: "Netto per maand", a: cur.mo, b: nxt.mo },
            { l: "Bruto per jaar", a: cur.gT, b: nxt.gT },
            { l: "Totale belasting", a: totalTax(cur), b: totalTax(nxt) },
            { l: "Heffingskortingen", a: cur.tC, b: nxt.tC },
            { l: "Toeslagen totaal", a: cur.tT, b: nxt.tT },
          ].map((r, i) => {
            const d = (r.b || 0) - (r.a || 0);
            return (
              <View key={i} style={S.tr}>
                <Text style={[S.td, { flex: 1.4 }]}>{r.l}</Text>
                <Text style={[S.tdRight, { flex: 1 }]}>{fmtEur(r.a)}</Text>
                <Text style={[S.tdMid, { flex: 0.8, color: d >= 0 ? C.green : C.red, fontWeight: "bold" }]}>{fmtSignedEur(d)}</Text>
                <Text style={[S.tdRight, { flex: 1 }]}>{fmtEur(r.b)}</Text>
              </View>
            );
          })}
        </View>

        {/* Charts Restored */}
        <View style={[S.grid2, { marginTop: 15 }]}>
          <View style={S.col}>
            <MiniBarChart title="Netto per maand" C={C} items={[{label: "Huidig", value: cur.mo}, {label: "Nieuw", value: nxt.mo, colorKey: "green"}]} />
          </View>
          <View style={[S.col, { marginRight: 0 }]}>
            <MiniBarChart title="Toeslagen per jaar" C={C} items={[{label: "Huidig", value: cur.tT}, {label: "Nieuw", value: nxt.tT, colorKey: "green"}]} />
          </View>
        </View>

        {/* Waterfall Breakdown Restored */}
        <WaterfallLite 
          title="Netto-drivers (nieuw scenario)" 
          C={C} 
          rows={[
            { label: "Bruto inkomen", value: nxt.gT },
            { label: "Belasting totaal", value: -totalTax(nxt) },
            { label: "Heffingskortingen", value: nxt.tC },
            { label: "Toeslagen", value: nxt.tT },
          ]}
          totalValue={nxt.nI}
          totalLabel="Netto per jaar"
        />

        <View style={S.footer}>
          <Text style={S.disclaimer}>Disclaimer: Vereenvoudigd rekenmodel. Controleer toeslagen via toeslagen.nl.</Text>
        </View>
      </Page>
    </Document>
  );
}