import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, CheckCircle2, Trophy, Calendar, Activity, Calculator } from "lucide-react";
import {
  calcularTeste3km, calcularProva5km, calcularProva10km, calcularCooper12min,
  formatMmss, parseMmss, parseHmmss, EVAL_LIMITS,
  type Teste3kmResult, type EvalKind,
} from "@/lib/teste-3km";
import { completeRunnerOnboarding, getRunnerOverview } from "@/lib/runner.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/corredor/onboarding")({ component: OnboardingPage });

type Distance = "5km" | "10km" | "21km" | "42km";
type Level = 1 | 2;

const DIST_LABEL: Record<Distance, string> = { "5km": "5KM", "10km": "10KM", "21km": "Meia maratona (21km)", "42km": "Maratona (42km)" };

const TEST_INSTRUCTIONS: Record<EvalKind, string> = {
  "3km": "Faça um aquecimento leve de 10 a 15 minutos. Em seguida, corra 3 km no maior ritmo que conseguir manter de forma constante. Cronometre e informe o tempo total (mm:ss).",
  "5km": "Use o resultado oficial (ou treino máximo) de uma prova de 5 km feita nos últimos 30 dias. Informe o tempo total (mm:ss).",
  "10km": "Use o resultado oficial de uma prova de 10 km feita nos últimos 30 dias. Informe o tempo total (hh:mm:ss).",
  "cooper": "Faça aquecimento, depois corra a maior distância possível em exatamente 12 minutos (em pista ou GPS). Informe a distância em metros.",
};
const TEST_LABEL: Record<EvalKind, string> = { "3km": "Teste 3km", "5km": "Prova 5km", "10km": "Prova 10km", "cooper": "Cooper 12min" };

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const getOverview = useServerFn(getRunnerOverview);
  const completeFn = useServerFn(completeRunnerOnboarding);

  const overviewQ = useQuery({
    queryKey: ["runner-overview", user?.id],
    queryFn: () => getOverview(),
    enabled: !!user,
  });

  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState<Distance | null>(null);
  const [raceDate, setRaceDate] = useState<string>("");
  const [level, setLevel] = useState<Level | null>(null);
  const [kind, setKind] = useState<EvalKind>("3km");
  const [tempo, setTempo] = useState("");
  const [meters, setMeters] = useState("");
  const [result, setResult] = useState<Teste3kmResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullName = useMemo(() =>
    overviewQ.data?.profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "Corredor",
  [overviewQ.data, user]);

  function handleTempoChange(v: string) {
    if (kind === "10km") {
      const digits = v.replace(/\D/g, "").slice(0, 6);
      let masked = digits;
      if (digits.length >= 5) masked = `${digits.slice(0, digits.length - 4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
      else if (digits.length >= 3) masked = `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
      setTempo(masked);
    } else {
      const digits = v.replace(/\D/g, "").slice(0, 4);
      let masked = digits;
      if (digits.length >= 3) masked = `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
      setTempo(masked);
    }
  }

  function handleCalcular() {
    setTestError(null);
    setResult(null);
    try {
      if (kind === "cooper") {
        const m = Number(meters);
        if (!Number.isFinite(m) || m <= 0) throw new Error("Informe a distância em metros.");
        if (m < EVAL_LIMITS.cooper.minM || m > EVAL_LIMITS.cooper.maxM)
          throw new Error(`Distância deve estar entre ${EVAL_LIMITS.cooper.minM}m e ${EVAL_LIMITS.cooper.maxM}m.`);
        setResult(calcularCooper12min(m));
        return;
      }
      const secs = kind === "10km" ? parseHmmss(tempo) : parseMmss(tempo);
      const limits = EVAL_LIMITS[kind];
      if ("minSec" in limits && (secs < limits.minSec || secs > limits.maxSec)) {
        const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
        throw new Error(`Tempo deve estar entre ${fmt(limits.minSec)} e ${fmt(limits.maxSec)}.`);
      }
      if (kind === "3km") setResult(calcularTeste3km(secs));
      else if (kind === "5km") setResult(calcularProva5km(secs));
      else if (kind === "10km") setResult(calcularProva10km(secs));
    } catch (e) {
      setTestError((e as Error).message);
    }
  }

  async function handleFinish() {
    if (!distance || !level || !result) return;
    setSubmitting(true);
    try {
      let inputMeters: number | null = null;
      let durationSec: number;
      if (kind === "cooper") { inputMeters = Number(meters); durationSec = 720; }
      else durationSec = kind === "10km" ? parseHmmss(tempo) : parseMmss(tempo);

      const r = await completeFn({ data: {
        fullName,
        goalDistance: distance,
        goalLevel: level,
        raceDate: raceDate || null,
        testSource: kind,
        testDate: new Date().toISOString().slice(0, 10),
        durationSeconds: durationSec,
        ftpSecondsPerKm: result.ftpSecondsPerKm,
        baseSpeedKmh: result.baseSpeedKmh,
        inputMeters,
        zones: result.zones.map((z) => ({
          id: z.id, level: z.level, pseMin: z.pseMin, pseMax: z.pseMax, phrase: z.phrase,
          pctFrom: z.pctFrom, pctTo: z.pctTo,
          paceSlowSec: z.paceSlowSec, paceFastSec: z.paceFastSec,
          velFrom: z.velFrom, velTo: z.velTo,
        })),
      }});
      toast.success("Tudo pronto! Sua planilha foi gerada.");
      navigate({ to: `/planilha-${r.goalDistance}` });
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha: ${msg}`);
    } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Vamos montar sua planilha</h1>
        <p className="text-muted-foreground">4 passos rápidos: objetivo, nível, avaliação e dias de treino.</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {[1,2,3,4].map((n) => (
          <div key={n} className={`flex items-center gap-2 ${n === step ? "text-foreground font-semibold" : n < step ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`size-7 rounded-full grid place-items-center text-xs ${n === step ? "bg-primary text-primary-foreground" : n < step ? "bg-primary/20 text-primary" : "bg-muted"}`}>
              {n < step ? <CheckCircle2 className="size-4" /> : n}
            </div>
            <span className="hidden sm:inline">{["Objetivo","Nível","Avaliação","Confirmar"][n-1]}</span>
            {n < 4 && <span className="text-muted-foreground/40">·</span>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle><Trophy className="inline size-5 mr-2" />Qual seu objetivo?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {(["5km","10km","21km","42km"] as Distance[]).map((d) => (
                <button key={d} type="button" onClick={() => setDistance(d)}
                  className={`rounded-lg border-2 p-4 text-left transition ${distance === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className="text-2xl font-bold font-display">{d.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{DIST_LABEL[d]}</div>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="race"><Calendar className="inline size-3.5 mr-1" />Data da prova (opcional)</Label>
              <Input id="race" type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button disabled={!distance} onClick={() => setStep(2)}>Próximo <ArrowRight /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Escolha seu nível</CardTitle>
            <CardDescription>Na dúvida, comece pelo Nível 1. Você poderá gerar uma nova planilha depois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setLevel(1)}
                className={`rounded-lg border-2 p-4 text-left transition ${level === 1 ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Badge variant="outline" className="mb-2">Nível 1</Badge>
                <div className="font-semibold">Iniciando ou retomando</div>
                <p className="text-sm text-muted-foreground mt-1">Para quem está começando na distância ou voltando aos treinos. Volume e intensidade conservadores.</p>
              </button>
              <button type="button" onClick={() => setLevel(2)}
                className={`rounded-lg border-2 p-4 text-left transition ${level === 2 ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Badge variant="outline" className="mb-2">Nível 2</Badge>
                <div className="font-semibold">Já tenho experiência</div>
                <p className="text-sm text-muted-foreground mt-1">Para quem treina com regularidade e tem experiência na distância. Volume e intensidade maiores.</p>
              </button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft /> Voltar</Button>
              <Button disabled={!level} onClick={() => setStep(3)}>Próximo <ArrowRight /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle><Activity className="inline size-5 mr-2" />Avaliação</CardTitle>
            <CardDescription>Escolha um teste para calcularmos seu pace e suas zonas de treino.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={kind} onValueChange={(v) => { setKind(v as EvalKind); setTempo(""); setMeters(""); setResult(null); setTestError(null); }}>
              <TabsList className="grid grid-cols-4 w-full">
                {(["3km","5km","10km","cooper"] as EvalKind[]).map((k) => (
                  <TabsTrigger key={k} value={k}>{TEST_LABEL[k]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">{TEST_INSTRUCTIONS[kind]}</p>
            </div>
            {kind === "cooper" ? (
              <div className="space-y-2">
                <Label htmlFor="meters">Distância em 12 min (metros)</Label>
                <Input id="meters" inputMode="numeric" placeholder="ex: 2400" value={meters} onChange={(e) => setMeters(e.target.value.replace(/\D/g,""))} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tempo">Tempo {kind === "10km" ? "(hh:mm:ss)" : "(mm:ss)"}</Label>
                <Input id="tempo" inputMode="numeric" placeholder={kind === "10km" ? "ex: 0:55:00" : "ex: 17:42"} value={tempo} onChange={(e) => handleTempoChange(e.target.value)} />
              </div>
            )}
            {testError && <p className="text-sm text-destructive">{testError}</p>}
            <Button onClick={handleCalcular} variant="secondary"><Calculator /> Calcular zonas</Button>

            {result && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Seu FTP (pace)</p>
                    <p className="font-mono text-2xl font-bold">{formatMmss(result.ftpSecondsPerKm)} <span className="text-sm font-normal text-muted-foreground">min/km</span></p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Velocidade base</p>
                    <p className="font-mono text-xl font-semibold">{result.baseSpeedKmh.toFixed(1)} km/h</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-5 gap-2">
                  {result.zones.map((z) => (
                    <div key={z.id} className={`rounded-md border p-2 text-xs ${z.color}`}>
                      <p className="font-bold">{z.id}</p>
                      <p className="font-mono">
                        {z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} → {z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}
                      </p>
                      <p className="font-mono text-muted-foreground">{z.velTo == null ? "Máx" : z.velTo.toFixed(1)} → {z.velFrom.toFixed(1)} km/h</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">"De" = pace mais rápido · "Até" = pace mais lento.</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft /> Voltar</Button>
              <Button disabled={!result} onClick={() => setStep(4)}>Próximo <ArrowRight /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Confirm */}
      {step === 4 && distance && level && result && (
        <Card>
          <CardHeader>
            <CardTitle>Tudo pronto?</CardTitle>
            <CardDescription>Confirme para gerar sua planilha. Você poderá escolher os dias da semana e personalizar tudo em seguida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded border p-3"><dt className="text-xs uppercase text-muted-foreground">Objetivo</dt><dd className="font-semibold">{DIST_LABEL[distance]}</dd></div>
              <div className="rounded border p-3"><dt className="text-xs uppercase text-muted-foreground">Nível</dt><dd className="font-semibold">Nível {level}</dd></div>
              <div className="rounded border p-3"><dt className="text-xs uppercase text-muted-foreground">FTP</dt><dd className="font-mono font-semibold">{formatMmss(result.ftpSecondsPerKm)} min/km</dd></div>
              <div className="rounded border p-3"><dt className="text-xs uppercase text-muted-foreground">Data da prova</dt><dd className="font-semibold">{raceDate || "—"}</dd></div>
            </dl>
            <p className="text-sm text-muted-foreground">
              Após confirmar, abriremos a tela da sua planilha {distance.toUpperCase()} onde você escolhe os dias da semana (4 ou 5 dias, dependendo do nível) e edita treinos livremente.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} disabled={submitting}><ArrowLeft /> Voltar</Button>
              <Button onClick={handleFinish} disabled={submitting}>
                {submitting ? "Gerando…" : "Gerar minha planilha"} <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
