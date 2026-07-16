export function GaugeChart({ value, max = 100, label, color = '#0A66C2' }: { value: number; max?: number; label: string; color?: string }) {
  const pct = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" viewBox="0 0 100 60" className="overflow-visible">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        <text x="50" y="38" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#374151">{Math.round(pct * 100)}%</text>
      </svg>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

export function BarChart({ data, colorMap }: { data: { label: string; count: number }[]; colorMap?: Record<string, string> }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-1.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-32 truncate shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.count / maxCount) * 100}%`, backgroundColor: colorMap?.[d.label] || '#0A66C2' }} />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, colorMap }: { data: { label: string; count: number }[]; colorMap?: Record<string, string> }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let acc = 0;
  const slices = data.map(d => {
    const start = (acc / total) * 360;
    acc += d.count;
    const end = (acc / total) * 360;
    return { ...d, start, end };
  });

  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const r = 40;
  const cx = 50, cy = 50;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        {slices.map(s => {
          const x1 = cx + r * Math.cos(toRad(s.start));
          const y1 = cy + r * Math.sin(toRad(s.start));
          const x2 = cx + r * Math.cos(toRad(s.end));
          const y2 = cy + r * Math.sin(toRad(s.end));
          const large = s.end - s.start > 180 ? 1 : 0;
          return (
            <path key={s.label} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={colorMap?.[s.label] || '#ddd'} />
          );
        })}
        <circle cx={cx} cy={cy} r={r * 0.6} fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" fill="#374151">{total}</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {data.map(d => (
          <span key={d.label} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap?.[d.label] || '#ddd' }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data }: { data: { month: string; count: number }[] }) {
  const w = 300, h = 100;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const pw = w / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => `${i * pw},${h - (d.count / maxCount) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="w-full max-w-full">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0A66C2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#areaGrad)" points={`0,${h} ${points} ${w},${h}`} />
      <polyline fill="none" stroke="#0A66C2" strokeWidth="2" points={points} />
      {data.map((d, i) => (
        <circle key={i} cx={i * pw} cy={h - (d.count / maxCount) * h} r="3" fill="#0A66C2" />
      ))}
    </svg>
  );
}
