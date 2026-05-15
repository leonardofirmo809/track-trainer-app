import { createFileRoute, Link } from "@tanstack/react-router";
import { PlanilhaCustomizerSheet } from "@/components/planilha/PlanilhaCustomizerSheet";
import { DistanceSelector } from "@/components/planilha/distance-selector";
import { StudentPicker } from "@/components/planilha/student-picker";
import { applyOverrides, getOverridesFromPayload, type WorkoutOverrides } from "@/lib/workout-overrides";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Home, ChevronRight, Save, Settings2, AlertTriangle, Download, Clock, Route as RouteIcon } from "lucide-react";
import { useCoachBranding } from "@/lib/use-coach-branding";
import { generatePlanilha21kmPdf, downloadBlob } from "@/lib/planilha-21km-pdf";
import { makeStatsLookup21km, formatKm, formatKm2, formatHms } from "@/lib/planilha-21km-stats";
import { computeWorkoutTotals, computePhaseTotals, type PhaseTotals } from "@/lib/planilha-5km-zone-distribution";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell, LabelList, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  WORKOUTS_21KM, WORKOUT_TYPES_21KM, PHASE_LABELS_21KM, DAY_ORDER, DAY_LABEL, DAY_FULL,
  type DayCode, type Workout21km as Workout, type Item, type SectionName, type ZoneId, type Phase21,
} from "@/lib/planilha-21km-data";
import { distributeWeek, type DistributionResult } from "@/lib/planilha-5km-distribute";
import { validateWeekDays21km } from "@/lib/planilha-21km-distribute";
import { getPlanilha21kmData, savePlanilha21kmConfig } from "@/lib/planilha-21km.functions";
import { formatMmss } from "@/lib/teste-3km";

export const Route = createFileRoute("/_authenticated/planilha-21km")({ component: Planilha21kmPage });

const PHASES: Phase21[] = [1, 2, 3, 4, 5];

type SavedZone = {
  id: ZoneId; level: string; pseMin: number; pseMax: number; phrase: string;
  pctFrom: number; pctTo: number | null;
  paceSlowSec: number | null; paceFastSec: number | null;
  velFrom: number; velTo: number | null;
};

function Planilha21kmPage() {
  const qc = useQueryClient();
  const getDataFn = useServerFn(getPlanilha21kmData);
  const saveFn = useServerFn(savePlanilha21kmConfig);

  const [studentId, setStudentId] = useState<string>("");
  const [level, setLevel] = useState<1 | 2>(1);
  const [weekDays, setWeekDays] = useState<DayCode[]>([]);
  const [phase, setPhase] = useState<Phase21>(1);
  const [applied, setApplied] = useState(false);

  const [openWorkout, setOpenWorkout] = useState<{ wo: Workout; day: DayCode } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [overrides, setOverrides] = useState<WorkoutOverrides>({});
  const [exporting, setExporting] = useState(false);
  const branding = useCoachBranding();

  const students = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const dataQuery = useQuery({
    enabled: !!studentId,
    queryKey: ["planilha-21km", studentId],
    queryFn: () => getDataFn({ data: { studentId } }),
  });

  const zones = useMemo<SavedZone[] | null>(() => {
    const meta = dataQuery.data?.latestTest?.metadata as { zones?: SavedZone[] } | null | undefined;
    return meta?.zones ?? null;
  }, [dataQuery.data]);

  const ftpSec = dataQuery.data?.latestTest?.pace_seconds_per_km ?? 0;
  const statsLookup = useMemo(() => makeStatsLookup21km(ftpSec), [ftpSec]);

  useEffect(() => {
    const plan = dataQuery.data?.plan;
    if (plan?.payload) {
      const p = plan.payload as { level: 1 | 2; weekDays: DayCode[]; currentPhase: Phase21 };
      const lv: 1 | 2 = p.level === 1 || p.level === 2 ? p.level : 1;
      const validDays = Array.isArray(p.weekDays) && p.weekDays.length === 4 ? p.weekDays : [];
      const ph: Phase21 = ([1,2,3,4,5] as Phase21[]).includes(p.currentPhase) ? p.currentPhase : 1;
      setLevel(lv);
      setWeekDays(validDays);
      setPhase(ph);
      setApplied(validDays.length === 4);
      setOverrides(getOverridesFromPayload(plan.payload));
    } else if (dataQuery.data) {
      const studentLevel = dataQuery.data.student?.level;
      const suggested: 1 | 2 = studentLevel === "iniciante" ? 1 : 2;
      setLevel(suggested);
      setWeekDays([]);
      setPhase(1);
      setApplied(false);
    }
  }, [dataQuery.data]);

  const validation = useMemo<string | null>(() => validateWeekDays21km(level, weekDays), [level, weekDays]);

  const weeks = useMemo(() => {
    if (!applied || validation) return null;
    const phaseWeeks = WORKOUTS_21KM[level][phase];
    const phaseOv = overrides[String(phase)] ?? {};
    return phaseWeeks.map((wos, w) => distributeWeek(applyOverrides(wos as never, phaseOv[String(w)]) as unknown as typeof wos, weekDays, level, WORKOUT_TYPES_21KM));
  }, [applied, level, phase, weekDays, validation, overrides]);

  async function persistConfig(opts: { phase?: Phase21 } = {}) {
    if (!studentId) return;
    setSaving(true);
    try {
      await saveFn({ data: {
        studentId, level, weekDays, currentPhase: opts.phase ?? phase,
      }});
      qc.invalidateQueries({ queryKey: ["planilha-21km", studentId] });
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar: ${msg}`);
    } finally { setSaving(false); }
  }

  function handleApply() {
    if (validation) return;
    void (async () => {
      setApplied(true);
      await persistConfig();
      toast.success("Configuração aplicada e salva.");
    })();
  }

  function changePhase(p: Phase21) {
    setPhase(p);
    if (applied) void persistConfig({ phase: p });
  }

  async function handleExportPdf() {
    if (!weeks || !zones || !dataQuery.data) return;
    setExporting(true);
    try {
      const blob = await generatePlanilha21kmPdf({
        studentName: dataQuery.data.student?.full_name ?? "Aluno",
        studentLevel: dataQuery.data.student?.level ?? null,
        ftpSecondsPerKm: dataQuery.data.latestTest?.pace_seconds_per_km ?? 0,
        zones,
        level, daysPerWeek: weekDays.length, weekDays, currentPhase: phase,
        weeks,
        branding: branding.data ?? { logoUrl: null, primary: "#0EA5E9", secondary: "#0F172A", coachName: "Treinador" },
      });
      const safeName = (dataQuery.data.student?.full_name ?? "aluno").replace(/[^\w\-]+/g, "-");
      downloadBlob(blob, `Planilha-21km-${safeName}-Plano${phase}.pdf`);
      toast.success("PDF gerado com sucesso.");
    } catch (e) {
      toast.error(`Falha ao gerar PDF: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link to="/dashboard" className="flex items-center gap-1 hover:text-foreground"><Home className="size-3.5" /> Início</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Planilha 21KM</span>
        </nav>
        <h1 className="text-3xl font-display font-bold">Planilha 21KM</h1>
        <p className="text-muted-foreground">Monte a planilha de meia maratona com paces personalizados a partir do FTP do aluno.</p>
      </div>

      <DistanceSelector current="21km" />

      <Card>
        <CardHeader><CardTitle>1. Atribuir a um aluno</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="aluno" className="mb-2 block">Aluno</Label>
          <StudentPicker
            value={studentId}
            onChange={setStudentId}
            distanceLabel="21km"
            level={level}
          />
        </CardContent>
      </Card>

      {studentId && dataQuery.data && (
        <Card>
          <CardHeader><CardTitle>2. Dados do aluno</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!zones ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertTriangle className="size-4 text-amber-600" /> Sem avaliação cadastrada.
                </div>
                <p className="text-muted-foreground">Cadastre uma avaliação (Teste 3km, Prova 5/10km ou Cooper) na tela de Avaliação.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/teste-3km">Ir para Avaliação</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Aluno</p>
                    <p className="font-medium">{dataQuery.data.student?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">FTP (pace)</p>
                    <p className="font-mono font-semibold">{formatMmss(dataQuery.data.latestTest?.pace_seconds_per_km ?? 0)} min/km</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Nível (cadastro)</p>
                    <p className="font-medium capitalize">{dataQuery.data.student?.level ?? "—"}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {zones.map((z) => (
                    <div key={z.id} className="rounded-md border p-2 text-xs">
                      <p className="font-bold">{z.id}</p>
                      <p className="font-mono">{z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} → {z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}</p>
                      <p className="font-mono text-muted-foreground">{z.velTo == null ? "Máx" : z.velTo.toFixed(1)} → {z.velFrom.toFixed(1)} km/h</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {studentId && zones && (
        <Card>
          <CardHeader><CardTitle>3. Configuração da semana</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Label>Nível da planilha</Label>
              <Tabs value={String(level)} onValueChange={(v) => {
                const lv = Number(v) as 1 | 2;
                setLevel(lv);
                setApplied(false);
              }}>
                <TabsList>
                  <TabsTrigger value="1">Nível 1</TabsTrigger>
                  <TabsTrigger value="2">Nível 2</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label>Dias da semana</Label>
              <p className="text-xs text-muted-foreground mt-1">Selecione exatamente 4 dias.</p>
              <div className="flex gap-3 mt-2 flex-wrap">
                {DAY_ORDER.map((d) => {
                  const checked = weekDays.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setWeekDays((prev) => v ? [...prev, d] : prev.filter((x) => x !== d));
                          setApplied(false);
                        }}
                      />
                      {DAY_LABEL[d]}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs mt-2 text-muted-foreground">Selecionados: <span className="font-semibold">{weekDays.length}</span></p>
            </div>

            {validation && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="size-3" /> {validation}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={!!validation || saving}>
                <Settings2 /> Aplicar configuração
              </Button>
              {applied && <span className="text-sm text-muted-foreground self-center">{saving ? "Salvando…" : "Salvo automaticamente"}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {applied && weeks && zones && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>4. Planilha e treinos</CardTitle>
            <div className="flex gap-2">
              {dataQuery.data?.plan?.id ? (
                <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
                  <Settings2 /> Personalizar planilha
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled title="Salve a planilha primeiro">
                  <Settings2 /> Personalizar planilha
                </Button>
              )}
              <Button onClick={handleExportPdf} disabled={exporting} size="sm">
                <Download /> {exporting ? "Gerando…" : "Exportar PDF"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={String(phase)} onValueChange={(v) => changePhase(Number(v) as Phase21)}>
              <TabsList>
                {PHASES.map((p) => (
                  <TabsTrigger key={p} value={String(p)}>Plano {p}</TabsTrigger>
                ))}
              </TabsList>
              {PHASES.map((p) => (
                <TabsContent key={p} value={String(p)} className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{PHASE_LABELS_21KM[p].subtitle}</p>
                  </div>
                  {weeks.map((wk, idx) => (
                    <WeekRow key={idx} index={idx + 1} dist={wk}
                      level={level} phase={phase} weekIdx={idx} statsLookup={statsLookup}
                      onOpen={(wo, day) => setOpenWorkout({ wo, day })} />
                  ))}
                  <PhaseChartsBlock
                    weeksWorkouts={weeks.map((wk) => wk.assignments.map((a) => a.workout).filter((w): w is Workout => !!w))}
                    level={level} phase={phase} statsLookup={statsLookup}
                  />
                </TabsContent>
              ))}
            </Tabs>

            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <p className="font-bold mb-2">LEMBRAR SEMPRE!</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Fazer os exercícios de Alongamento, Mobilidade e Fortalecimento;</li>
                <li>Após o aquecimento fazer os educativos de corrida;</li>
                <li>Passar o feedback dos treinos, nem que seja apenas um "tudo certo";</li>
                <li>Sincronizar o treino no seu aplicativo de GPS e no Strava;</li>
                <li>Qualquer dúvida entrar em contato.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!openWorkout} onOpenChange={(o) => !o && setOpenWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {openWorkout && zones && (
            <>
              <DialogHeader>
                <DialogTitle>{openWorkout.wo.code} — {openWorkout.wo.type} | {DAY_FULL[openWorkout.day]}</DialogTitle>
              </DialogHeader>
              <WorkoutDetail wo={openWorkout.wo} zones={zones} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {applied && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => persistConfig()} disabled={saving}>
            <Save /> {saving ? "Salvando…" : "Salvar configuração"}
          </Button>
        </div>
      )}

      {dataQuery.data?.plan?.id && (
        <PlanilhaCustomizerSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          planId={dataQuery.data.plan.id}
          initialOverrides={overrides}
          onSaved={(ov) => { setOverrides(ov); dataQuery.refetch(); }}
          phases={[1, 2, 3, 4, 5]}
          initialPhase={phase}
          phaseLabels={PHASE_LABELS_21KM}
          getRawPhaseWeeks={(p) => WORKOUTS_21KM[level][p as 1|2|3|4|5] as never}
          distributeWeek={(wos) => distributeWeek(wos as never, weekDays, level, WORKOUT_TYPES_21KM) as never}
          workoutTypes={WORKOUT_TYPES_21KM}
          workoutTypesList={Object.keys(WORKOUT_TYPES_21KM)}
        />
      )}
    </div>
  );
}

type StatsLookup = (level: 1 | 2, phase: 1 | 2 | 3 | 4, weekIdx: number, code: string) => { durationMin: number; volumeM: number } | null;

function WeekRow({ index, dist, level, phase, weekIdx, statsLookup, onOpen }: {
  index: number; dist: DistributionResult<Workout>; level: 1 | 2; phase: Phase21; weekIdx: number;
  statsLookup: StatsLookup;
  onOpen: (wo: Workout, day: DayCode) => void;
}) {
  const workouts = dist.assignments.map((a) => a.workout).filter((x): x is Workout => !!x);
  const phaseAs4 = phase as 1 | 2 | 3 | 4;
  const perWorkoutMap = useMemo(() => {
    const m = new Map<string, { lightPct: number; hardPct: number }>();
    workouts.forEach((wo) => {
      const t = computeWorkoutTotals(wo, level, phaseAs4, weekIdx, statsLookup);
      m.set(wo.code, { lightPct: t.lightPct, hardPct: t.hardPct });
    });
    return m;
  }, [workouts, level, phaseAs4, weekIdx, statsLookup]);

  return (
    <div className="space-y-3">
      <p className="font-semibold mb-2">Semana {index}</p>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {dist.assignments.map((a) => {
          const stat = a.workout ? statsLookup(level, phaseAs4, weekIdx, a.workout.code) : null;
          const pct = a.workout ? perWorkoutMap.get(a.workout.code) : null;
          return (
            <div key={a.day}>
              {a.workout ? (
                <button
                  type="button"
                  onClick={() => onOpen(a.workout!, a.day)}
                  className={`w-full text-left rounded-md border-2 p-3 hover:opacity-90 transition ${WORKOUT_TYPES_21KM[a.workout.type].color}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{DAY_LABEL[a.day]}</span>
                    <span className="text-[10px] opacity-80">{a.workout.code}</span>
                  </div>
                  <p className="text-sm font-semibold leading-tight">{a.workout.type}</p>
                  {stat && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] opacity-90">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{Math.round(stat.durationMin)} min</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1"><RouteIcon className="size-3" />{formatKm(stat.volumeM)}</span>
                    </div>
                  )}
                  {pct && (
                    <p className="text-[11px] mt-1 font-semibold">
                      <span style={{ color: "var(--color-intensity-light-fg)" }}>{pct.lightPct.toFixed(1).replace(".", ",")}% L</span>
                      <span className="opacity-60"> | </span>
                      <span style={{ color: "var(--color-intensity-hard-fg)" }}>{pct.hardPct.toFixed(1).replace(".", ",")}% M/H</span>
                    </p>
                  )}
                  <p className="text-[11px] opacity-80 mt-1">{a.workout.zones.join(" / ")}</p>
                </button>
              ) : (
                <div className="rounded-md border-2 border-dashed border-muted-foreground/30 p-3 text-center text-xs text-muted-foreground bg-muted/30">
                  <p className="font-bold">{DAY_LABEL[a.day]}</p>
                  <p className="mt-2">OFF</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseChartsBlock({ weeksWorkouts, level, phase, statsLookup }: {
  weeksWorkouts: Workout[][]; level: 1 | 2; phase: Phase21; statsLookup: StatsLookup;
}) {
  const phaseAs4 = phase as 1 | 2 | 3 | 4;
  const totals = useMemo(() => computePhaseTotals(weeksWorkouts, level, phaseAs4, statsLookup), [weeksWorkouts, level, phaseAs4, statsLookup]);
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-[280px_1fr_1fr] mt-2">
      <PhaseTotalsCard totals={totals} />
      <PhaseVolumeChart perWeek={totals.perWeek} />
      <PhaseIntensityChart perWeek={totals.perWeek} />
    </div>
  );
}

function PhaseTotalsCard({ totals }: { totals: PhaseTotals }) {
  const rows = [
    { label: "Total Volume", value: formatKm2(totals.totalM) },
    { label: "Total Duração", value: formatHms(totals.totalMin) },
    { label: "L — Z1 e Z2", value: `${totals.lightPct.toFixed(1).replace(".", ",")}%`, tone: "light" as const },
    { label: "M/H — Z3, Z4 e Z5", value: `${totals.hardPct.toFixed(1).replace(".", ",")}%`, tone: "hard" as const },
  ];
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="bg-warning text-warning-foreground px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide">Quanto que você vai treinar</p>
        <p className="text-[10px] opacity-80">Total da planilha</p>
      </div>
      <div className="divide-y">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-3 py-2 text-sm"
            style={
              r.tone === "light"
                ? { background: "color-mix(in oklab, var(--color-intensity-light) 18%, transparent)" }
                : r.tone === "hard"
                ? { background: "color-mix(in oklab, var(--color-intensity-hard) 18%, transparent)" }
                : undefined
            }
          >
            <span className="font-medium text-muted-foreground">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const VOLUME_GREEN = [
  "var(--color-volume-1)", "var(--color-volume-2)",
  "var(--color-volume-3)", "var(--color-volume-4)",
];

function PhaseVolumeChart({ perWeek }: { perWeek: PhaseTotals["perWeek"] }) {
  const data = perWeek.map((wk, i) => ({ week: `S${i + 1}`, km: +(wk.totalM / 1000).toFixed(2) }));
  const maxKm = Math.max(1, ...data.map((d) => d.km));
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-center mb-2">Volume</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 26, right: 12, bottom: 4, left: 8 }}>
          <XAxis dataKey="week" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, maxKm * 1.18]} />
          <RTooltip cursor={{ fill: "transparent" }} formatter={(v: number) => [`${v.toFixed(2).replace(".", ",")} km`, "Volume"]} />
          <Bar dataKey="km" radius={[6, 6, 0, 0]} isAnimationActive>
            {data.map((_, i) => (<Cell key={i} fill={VOLUME_GREEN[i % VOLUME_GREEN.length]} />))}
            <LabelList dataKey="km" position="top" formatter={(v: number) => `${v.toFixed(2).replace(".", ",")} km`} style={{ fontSize: 11, fontWeight: 700, fill: "var(--color-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PhaseIntensityChart({ perWeek }: { perWeek: PhaseTotals["perWeek"] }) {
  const data = perWeek.map((wk, i) => ({ week: `S${i + 1}`, L: +wk.lightPct.toFixed(1), MH: +wk.hardPct.toFixed(1) }));
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-center mb-2">Intensidade</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 26, right: 12, bottom: 4, left: 8 }} barCategoryGap="20%">
          <XAxis dataKey="week" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 115]} />
          <RTooltip cursor={{ fill: "transparent" }} formatter={(v: number, n: string) => [`${v.toFixed(1).replace(".", ",")}%`, n === "L" ? "Leve" : "Médio/Alto"]} />
          <Legend verticalAlign="bottom" height={24} iconType="square" formatter={(v: string) => (v === "L" ? "L = Leve" : "M/H = Médio/Alto")} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="L" fill="var(--color-intensity-light)" radius={[4, 4, 0, 0]} isAnimationActive>
            <LabelList dataKey="L" position="top" formatter={(v: number) => `${v.toFixed(1).replace(".", ",")}%`} style={{ fontSize: 10, fontWeight: 700, fill: "var(--color-foreground)" }} />
          </Bar>
          <Bar dataKey="MH" fill="var(--color-intensity-hard)" radius={[4, 4, 0, 0]} isAnimationActive>
            <LabelList dataKey="MH" position="top" formatter={(v: number) => `${v.toFixed(1).replace(".", ",")}%`} style={{ fontSize: 10, fontWeight: 700, fill: "var(--color-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const SECTION_LABEL: Record<SectionName, string> = {
  warmup: "Aquecimento", main: "Treino Principal", recovery: "Recuperação", complement: "Complemento",
};

function WorkoutDetail({ wo, zones }: { wo: Workout; zones: SavedZone[] }) {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  return (
    <div className="space-y-4">
      {wo.note && <p className="text-sm italic text-muted-foreground">"{wo.note}"</p>}
      {wo.sections.map((sct, i) => (
        <div key={i}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{SECTION_LABEL[sct.name]}</p>
          <ul className="space-y-2">
            {sct.items.map((it, j) => <li key={j}>{renderItem(it, zoneMap)}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function unitLabel(u: "min" | "sec" | "m"): string {
  return u === "min" ? "min" : u === "sec" ? "seg" : "m";
}

function zoneRangeText(zone: ZoneId, zoneMap: Map<ZoneId, SavedZone>): string {
  const z = zoneMap.get(zone);
  if (!z) return "";
  const pace = `${z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} a ${z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)} min/km`;
  const kmh = `${z.velFrom.toFixed(2).replace(".", ",")} a ${z.velTo == null ? "Máx" : z.velTo.toFixed(2).replace(".", ",")} km/h`;
  return `${pace} | ${kmh}`;
}

function renderItem(it: Item, zoneMap: Map<ZoneId, SavedZone>) {
  if (it.kind === "single") {
    return (
      <div className="rounded border bg-card/50 p-2">
        <p className="text-sm font-medium">{it.value}{unitLabel(it.unit)} {it.zone}</p>
        <p className="text-xs text-muted-foreground font-mono">→ {zoneRangeText(it.zone, zoneMap)}</p>
      </div>
    );
  }
  if (it.kind === "intervals") {
    return (
      <div className="rounded border bg-card/50 p-2 space-y-1">
        <p className="text-sm font-medium">{it.reps}x ({it.on.value}{unitLabel(it.on.unit)} {it.on.zone} + {it.off.value}{unitLabel(it.off.unit)} {it.off.zone})</p>
        <p className="text-xs text-muted-foreground font-mono">ON {it.on.zone}: {zoneRangeText(it.on.zone, zoneMap)}</p>
        <p className="text-xs text-muted-foreground font-mono">OFF {it.off.zone}: {zoneRangeText(it.off.zone, zoneMap)}</p>
      </div>
    );
  }
  return (
    <div className="rounded border bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 p-2">
      <p className="text-sm font-bold">{it.meters}m — {it.label} ⭐</p>
      {it.note && <p className="text-xs text-muted-foreground italic mt-1">{it.note}</p>}
    </div>
  );
}
