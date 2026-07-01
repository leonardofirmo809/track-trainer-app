import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, Legend,
} from "recharts";

export type WeekBlockRow = {
  weekNum: number;
  totalM: number;
  totalMin: number;
  lightPct: number;
  hardPct: number;
};

export type PhaseBlock = {
  phaseNum: number;
  label: string;
  subtitle: string;
  perWeek: WeekBlockRow[];
  totalM: number;
  totalMin: number;
  lightPct: number;
  hardPct: number;
};

const VOLUME_COLORS = [
  "var(--color-volume-1)", "var(--color-volume-2)",
  "var(--color-volume-3)", "var(--color-volume-4)",
];

function fmtKm(m: number) {
  return `${(m / 1000).toFixed(2).replace(".", ",")} km`;
}

function fmtHms(totalMin: number) {
  const totalSec = Math.round(totalMin * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function BlockSummaryCard({ block }: { block: PhaseBlock }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden self-start">
      <div className="px-3 py-2.5 bg-muted/50 border-b">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Resumo do bloco
        </p>
        <p className="text-xs font-semibold mt-0.5">{block.perWeek.length} semanas</p>
      </div>
      <div className="divide-y text-sm">
        <div className="flex justify-between px-3 py-2">
          <span className="text-muted-foreground text-xs">Volume total</span>
          <span className="font-semibold tabular-nums text-xs">{fmtKm(block.totalM)}</span>
        </div>
        <div className="flex justify-between px-3 py-2">
          <span className="text-muted-foreground text-xs">Duração total</span>
          <span className="font-semibold font-mono text-xs tabular-nums">{fmtHms(block.totalMin)}</span>
        </div>
        <div
          className="flex justify-between px-3 py-2"
          style={{ background: "color-mix(in oklab, var(--color-intensity-light) 18%, transparent)" }}
        >
          <span className="text-xs font-medium text-muted-foreground">L — Z1 + Z2</span>
          <span className="text-xs font-bold tabular-nums">
            {block.lightPct.toFixed(1).replace(".", ",")}%
          </span>
        </div>
        <div
          className="flex justify-between px-3 py-2"
          style={{ background: "color-mix(in oklab, var(--color-intensity-hard) 18%, transparent)" }}
        >
          <span className="text-xs font-medium text-muted-foreground">M/H — Z3 a Z5</span>
          <span className="text-xs font-bold tabular-nums">
            {block.hardPct.toFixed(1).replace(".", ",")}%
          </span>
        </div>
      </div>
    </div>
  );
}

function BlockVolumeChart({ perWeek }: { perWeek: WeekBlockRow[] }) {
  const data = perWeek.map((w) => ({
    week: `S${w.weekNum}`,
    km: +(w.totalM / 1000).toFixed(2),
  }));
  const maxKm = Math.max(1, ...data.map((d) => d.km));

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground mb-1">
        VOLUME
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 30, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, maxKm * 1.22]} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(v: number) => [`${v.toFixed(2).replace(".", ",")} km`, "Volume"]}
          />
          <Bar dataKey="km" radius={[6, 6, 0, 0]} isAnimationActive>
            {data.map((_, i) => (
              <Cell key={i} fill={VOLUME_COLORS[i % VOLUME_COLORS.length]} />
            ))}
            <LabelList
              dataKey="km"
              position="top"
              formatter={(v: number) => `${v.toFixed(2).replace(".", ",")} km`}
              style={{ fontSize: 10, fontWeight: 700, fill: "var(--color-foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BlockIntensityChart({ perWeek }: { perWeek: WeekBlockRow[] }) {
  const data = perWeek.map((w) => ({
    week: `S${w.weekNum}`,
    L: +w.lightPct.toFixed(1),
    MH: +w.hardPct.toFixed(1),
  }));

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground mb-1">
        INTENSIDADE
      </p>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 30, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, 120]} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(v: number, name: string) => [
              `${v.toFixed(1).replace(".", ",")}%`,
              name === "L" ? "Leve (Z1+Z2)" : "Médio/Alto (Z3-Z5)",
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={22}
            iconType="square"
            formatter={(v: string) => (v === "L" ? "L — Leve" : "M/H — Médio/Alto")}
            wrapperStyle={{ fontSize: 10 }}
          />
          <Bar dataKey="L" fill="var(--color-intensity-light)" radius={[4, 4, 0, 0]} isAnimationActive>
            <LabelList
              dataKey="L"
              position="top"
              formatter={(v: number) => `${v.toFixed(1).replace(".", ",")}%`}
              style={{ fontSize: 9, fontWeight: 700, fill: "var(--color-foreground)" }}
            />
          </Bar>
          <Bar dataKey="MH" fill="var(--color-intensity-hard)" radius={[4, 4, 0, 0]} isAnimationActive>
            <LabelList
              dataKey="MH"
              position="top"
              formatter={(v: number) => `${v.toFixed(1).replace(".", ",")}%`}
              style={{ fontSize: 9, fontWeight: 700, fill: "var(--color-foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlanAllPhasesSummary({ blocks }: { blocks: PhaseBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <div key={block.phaseNum} className="rounded-xl border bg-card/40 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
            <div
              className="flex items-center justify-center size-8 rounded-full text-sm font-bold shrink-0 text-primary-foreground"
              style={{ background: "var(--color-primary, #0EA5E9)" }}
            >
              {block.phaseNum}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{block.label}</p>
              <p className="text-xs text-muted-foreground">{block.subtitle}</p>
            </div>
            <div className="text-right hidden sm:block shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Volume do bloco
              </p>
              <p className="font-mono font-bold text-sm">{fmtKm(block.totalM)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr] gap-3 p-3">
            <BlockSummaryCard block={block} />
            <BlockVolumeChart perWeek={block.perWeek} />
            <BlockIntensityChart perWeek={block.perWeek} />
          </div>
        </div>
      ))}
    </div>
  );
}
