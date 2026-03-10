import { C, M } from "../constants/theme.js";
import { calcMTR } from "../lib/taxEngine.js";

export default function MTRChart({ p, ci }) {
  const W = 560, H = 220, pd = { t: 30, r: 20, b: 40, l: 50 }, w = W - pd.l - pd.r, h = H - pd.t - pd.b;
  const pts = [];
  for (let i = 1000; i <= 130000; i += 500) {
    const { mtr } = calcMTR(p, i);
    pts.push({ x: i, y: Math.max(0, Math.min(0.9, mtr)) });
  }
  const sx = (x) => pd.l + (x / 130000) * w, sy = (y) => pd.t + h - (y / 0.9) * h;
  const path = pts.map((pt, i) => `${i ? "L" : "M"}${sx(pt.x).toFixed(1)},${sy(pt.y).toFixed(1)}`).join(" ");
  const cur = calcMTR(p, ci);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      <defs>
        <linearGradient id="mG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.primary} stopOpacity=".12" />
          <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={pd.l} y={pd.t} width={w} height={h} fill="#f8fafc" rx="6" stroke={C.lb} strokeWidth=".5" />
      {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
        <g key={v}>
          <line x1={pd.l} x2={pd.l + w} y1={sy(v)} y2={sy(v)} stroke="#e2e8f0" strokeWidth=".5" />
          <text x={pd.l - 6} y={sy(v) + 4} textAnchor="end" fill={C.lm} fontSize="10" fontFamily={M}>
            {v * 100}%
          </text>
        </g>
      ))}
      {[0, 25e3, 5e4, 75e3, 1e5, 125e3].map((v) => (
        <text key={v} x={sx(v)} y={pd.t + h + 18} textAnchor="middle" fill={C.lm} fontSize="10" fontFamily={M}>
          {v / 1e3}k
        </text>
      ))}
      <rect
        x={sx(43071)}
        y={pd.t}
        width={sx(76817) - sx(43071)}
        height={h}
        fill="rgba(220,38,38,0.04)"
        rx="4"
      />
      <text
        x={(sx(43071) + sx(76817)) / 2}
        y={pd.t + 14}
        textAnchor="middle"
        fill={C.red}
        fontSize="9"
        fontWeight="600"
        opacity=".5"
      >
        PIEKZONE
      </text>
      <path
        d={`${path}L${sx(130000).toFixed(1)},${sy(0).toFixed(1)}L${sx(1000).toFixed(1)},${sy(0).toFixed(1)}Z`}
        fill="url(#mG2)"
      />
      <path d={path} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
      <circle
        cx={sx(ci)}
        cy={sy(Math.max(0, Math.min(0.9, cur.mtr)))}
        r="6"
        fill={C.red}
        stroke="#fff"
        strokeWidth="2.5"
      />
      <text
        x={sx(ci) + (ci > 100000 ? -40 : 10)}
        y={sy(cur.mtr) - 10}
        fill={C.red}
        fontSize="12"
        fontWeight="700"
        fontFamily={M}
      >
        {(cur.mtr * 100).toFixed(0)}%
      </text>
      <text x={pd.l + w / 2} y={H - 4} textAnchor="middle" fill={C.lm} fontSize="11">
        Bruto inkomen →
      </text>
    </svg>
  );
}
