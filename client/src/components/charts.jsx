// Small dependency-free SVG charts: stacked/grouped bars, line, donut, horizontal bars.
const niceMax = (v) => { if (v <= 4) return 4; if (v <= 8) return 8; if (v <= 20) return Math.ceil(v / 4) * 4; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10) * p; };
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
export const Legend = ({ series }) => <div className="legend">{series.map((s) => <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>)}</div>;

function Grid({ max, P, W, ih }) {
  return [0, 1, 2, 3, 4].map((i) => { const y = P.t + ih - (ih * i) / 4; return <g key={i}><line x1={P.l} x2={W - P.r} y1={y} y2={y} className="grid" /><text x={P.l - 7} y={y + 4} className="ax" textAnchor="end">{Math.round((max * i) / 4)}</text></g>; });
}

export function Bars({ data, series, h = 230, stacked = true }) {
  const W = 640; const P = { l: 34, r: 8, t: 10, b: 40 }; const iw = W - P.l - P.r; const ih = h - P.t - P.b;
  const max = niceMax(Math.max(1, ...data.map((d) => (stacked ? sum(series, (s) => d[s.key] || 0) : Math.max(...series.map((s) => d[s.key] || 0))))));
  const bw = iw / Math.max(1, data.length);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${h}`} className="chart" role="img" aria-label="Bar chart">
        <Grid max={max} P={P} W={W} ih={ih} />
        {data.map((d, i) => {
          const x0 = P.l + i * bw; let acc = 0;
          const bars = stacked
            ? series.map((s) => { const v = d[s.key] || 0; if (!v) return null; const w = Math.min(bw * 0.56, 46); const y = P.t + ih - (ih * (acc + v)) / max; acc += v; return <rect key={s.key} x={x0 + (bw - w) / 2} y={y} width={w} height={(ih * v) / max} fill={s.color}><title>{`${d.label} · ${s.label}: ${v}`}</title></rect>; })
            : series.map((s, j) => { const v = d[s.key] || 0; const n = series.length; const sw = Math.min((bw * 0.72) / n, 26); const x = x0 + (bw - sw * n) / 2; const hh = (ih * v) / max; return <rect key={s.key} x={x + j * sw + 1} y={P.t + ih - hh} width={sw - 2} height={hh} rx="3" fill={s.color}><title>{`${d.label} · ${s.label}: ${v}`}</title></rect>; });
          const lb = String(d.label);
          return <g key={lb + i}>{bars}<text x={x0 + bw / 2} y={h - P.b + 16} className="ax" textAnchor="middle">{lb.length > 13 ? `${lb.slice(0, 12)}…` : lb}</text></g>;
        })}
      </svg>
      {series.length > 1 && <Legend series={series} />}
    </>
  );
}

export function LineChart({ labels, series, h = 230 }) {
  const W = 640; const P = { l: 34, r: 14, t: 12, b: 30 }; const iw = W - P.l - P.r; const ih = h - P.t - P.b;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.vals.filter((v) => v != null))));
  const x = (i) => P.l + (labels.length < 2 ? iw / 2 : (iw * i) / (labels.length - 1)); const y = (v) => P.t + ih - (ih * v) / max;
  const step = Math.max(1, Math.ceil(labels.length / 7));
  return (
    <>
      <svg viewBox={`0 0 ${W} ${h}`} className="chart" role="img" aria-label="Line chart">
        <Grid max={max} P={P} W={W} ih={ih} />
        {labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? <text key={i} x={x(i)} y={h - 9} className="ax" textAnchor="middle">{l}</text> : null))}
        {series.map((s) => {
          let d = ''; let first = null; let last = null;
          s.vals.forEach((v, i) => { if (v == null) return; d += `${first == null ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; if (first == null) first = i; last = i; });
          if (first == null) return null;
          return (
            <g key={s.label}>
              {s.area && <path d={`${d}L${x(last).toFixed(1)},${y(0)}L${x(first).toFixed(1)},${y(0)}Z`} fill={s.color} opacity=".1" />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.4" strokeDasharray={s.dash ? '6 5' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(last)} cy={y(s.vals[last])} r="4" fill={s.color}><title>{`${s.label}: ${s.vals[last]}`}</title></circle>
            </g>
          );
        })}
      </svg>
      <Legend series={series} />
    </>
  );
}

export function Donut({ items, label, sub, size = 150 }) {
  const tot = sum(items, (i) => i.value); const r = 60; const C = 2 * Math.PI * r; let off = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label="Donut chart">
        {!tot && <circle r="60" cx="80" cy="80" fill="none" stroke="var(--line)" strokeWidth="18" />}
        {items.map((it) => { if (!it.value) return null; const len = (C * it.value) / tot; const el = <circle key={it.label} r={r} cx="80" cy="80" fill="none" stroke={it.color} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-off} transform="rotate(-90 80 80)"><title>{`${it.label}: ${it.value}`}</title></circle>; off += len; return el; })}
        <text x="80" y="82" textAnchor="middle" className="dn-v">{label}</text><text x="80" y="102" textAnchor="middle" className="dn-s">{sub}</text>
      </svg>
      <div className="lg-v">{items.map((it) => <div key={it.label}><i style={{ background: it.color }} />{it.label}<b>{it.value}</b></div>)}</div>
    </div>
  );
}
