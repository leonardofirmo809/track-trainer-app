import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, ChevronRight, Save, Calculator, FileDown } from "lucide-react";
import {
  calcularTeste3km, calcularProva5km, calcularProva10km, calcularCooper12min,
  formatMmss, parseMmss, parseHmmss, EVAL_LIMITS,
  type Teste3kmResult, type EvalKind,
} from "@/lib/teste-3km";
import { saveTeste3km } from "@/lib/tests-3km.functions";
import { useCoachBranding } from "@/lib/use-coach-branding";
import { generateTeste3kmPdf, downloadPdf } from "@/lib/teste-3km-pdf";

export const Route = createFileRoute("/_authenticated/teste-3km")({ component: Teste3kmPage });

const TAB_LABEL: Record<EvalKind, string> = {
  "3km": "Teste 3km",
  "5km": "Prova 5km",
  "10km": "Prova 10km",
  "cooper": "Cooper 12min",
};
const TAB_HINT: Record<EvalKind, string> = {
  "3km": "Tempo no formato mm:ss (ex: 17:42)",
  "5km": "Tempo no formato mm:ss (ex: 28:30)",
  "10km": "Tempo no formato hh:mm:ss (ex: 1:02:45)",
  "cooper": "Distância percorrida em 12 min (em metros)",
};

function Teste3kmPage() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveTeste3km);

  const [studentId, setStudentId] = useState<string>("");
  const [kind, setKind] = useState<EvalKind>("3km");
  const [tempo, setTempo] = useState<string>("");
  const [meters, setMeters] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Teste3kmResult | null>(null);
  const [saving, setSaving] = useState(false);
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

  const studentName = useMemo(
    () => students.data?.find((s) => s.id === studentId)?.full_name ?? "",
    [students.data, studentId]
  );

  function handleTempoChange(v: string) {
    if (kind === "10km") {
      // hh:mm:ss máscara
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

  function handleLimpar() {
    setStudentId("");
    setTempo("");
    setMeters("");
    setResult(null);
    setError(null);
  }

  function handleKindChange(k: string) {
    setKind(k as EvalKind);
    setTempo("");
    setMeters("");
    setResult(null);
    setError(null);
  }

  function handleCalcular() {
    setError(null);
    setResult(null);
    try {
      if (kind === "cooper") {
        const m = Number(meters);
        if (!Number.isFinite(m) || m <= 0) throw new Error("Informe a distância em metros.");
        if (m < EVAL_LIMITS.cooper.minM || m > EVAL_LIMITS.cooper.maxM) {
          throw new Error(`Distância deve estar entre ${EVAL_LIMITS.cooper.minM}m e ${EVAL_LIMITS.cooper.maxM}m.`);
        }
        setResult(calcularCooper12min(m));
        return;
      }
      const secs = kind === "10km" ? parseHmmss(tempo) : parseMmss(tempo);
      const limits = EVAL_LIMITS[kind];
      if ("minSec" in limits && (secs < limits.minSec || secs > limits.maxSec)) {
        const fmt = (s: number) => {
          const m = Math.floor(s / 60), r = s % 60;
          return `${m}:${String(r).padStart(2, "0")}`;
        };
        throw new Error(`Tempo deve estar entre ${fmt(limits.minSec)} e ${fmt(limits.maxSec)} para ${TAB_LABEL[kind]}.`);
      }
      if (kind === "3km") setResult(calcularTeste3km(secs));
      else if (kind === "5km") setResult(calcularProva5km(secs));
      else if (kind === "10km") setResult(calcularProva10km(secs));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleSalvar() {
    if (!result) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          studentId,
          testDate: date,
          durationSeconds: result.durationSeconds,
          ftpSecondsPerKm: result.ftpSecondsPerKm,
          baseSpeedKmh: result.baseSpeedKmh,
          source: kind,
          inputMeters: kind === "cooper" ? Number(meters) : null,
          zones: result.zones.map((z) => ({
            id: z.id, level: z.level, pseMin: z.pseMin, pseMax: z.pseMax, phrase: z.phrase,
            pctFrom: z.pctFrom, pctTo: z.pctTo,
            paceSlowSec: z.paceSlowSec, paceFastSec: z.paceFastSec,
            velFrom: z.velFrom, velTo: z.velTo,
          })),
        },
      });
      toast.success(`Avaliação salva no perfil de ${studentName}`);
      qc.invalidateQueries({ queryKey: ["tests", studentId] });
      setResult(null);
      setTempo("");
      setMeters("");
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    if (!result || !branding.data) return;
    setExporting(true);
    try {
      const blob = await generateTeste3kmPdf({
        result, studentName: studentName || null, testDate: date, branding: branding.data,
      });
      const safe = (studentName || "teste-avulso").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      downloadPdf(blob, `avaliacao-${kind}-${safe}-${date}.pdf`);
      toast.success("PDF gerado.");
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
          <span className="text-foreground">Avaliação</span>
        </nav>
        <h1 className="text-3xl font-display font-bold">Avaliação</h1>
        <p className="text-muted-foreground">Calcule o FTP e as zonas do aluno a partir de Teste 3km, Prova 5km, Prova 10km ou Cooper 12min.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Tipo de avaliação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={handleKindChange}>
            <TabsList>
              <TabsTrigger value="3km">Teste 3km</TabsTrigger>
              <TabsTrigger value="5km">Prova 5km</TabsTrigger>
              <TabsTrigger value="10km">Prova 10km</TabsTrigger>
              <TabsTrigger value="cooper">Cooper 12min</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label htmlFor="aluno">Aluno (opcional)</Label>
              <Select value={studentId || "__none__"} onValueChange={(v) => setStudentId(v === "__none__" ? "" : v)}>
                <SelectTrigger id="aluno"><SelectValue placeholder={students.isLoading ? "Carregando…" : "Nenhum (avulso)"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum (avulso) —</SelectItem>
                  {students.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              {kind === "cooper" ? (
                <>
                  <Label htmlFor="meters">Distância (metros) *</Label>
                  <Input
                    id="meters"
                    inputMode="numeric"
                    placeholder="Ex: 2400"
                    value={meters}
                    onChange={(e) => setMeters(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="tempo">Tempo *</Label>
                  <Input
                    id="tempo"
                    inputMode="numeric"
                    placeholder={kind === "10km" ? "Ex: 1:02:45" : "Ex: 17:42"}
                    value={tempo}
                    onChange={(e) => handleTempoChange(e.target.value)}
                    maxLength={kind === "10km" ? 8 : 5}
                  />
                </>
              )}
              <p className="text-xs text-muted-foreground mt-1">{TAB_HINT[kind]}</p>
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {error && <div className="md:col-span-3 text-sm text-destructive">{error}</div>}
            <div className="md:col-span-3 flex gap-2">
              <Button onClick={handleCalcular}><Calculator /> Calcular</Button>
              <Button variant="outline" onClick={handleLimpar}>Limpar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Resultado — {TAB_LABEL[kind]}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {studentId ? <>Aluno: <span className="font-medium text-foreground">{studentName}</span></> : <span className="font-medium text-foreground">Avulso</span>}
                  {kind === "cooper"
                    ? <> • Distância: <span className="font-medium text-foreground">{meters}m em 12min</span></>
                    : <> • Tempo: <span className="font-medium text-foreground">{tempo}</span></>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">FTP</p>
                <p className="text-3xl font-display font-bold">{formatMmss(result.ftpSecondsPerKm)} <span className="text-sm font-normal text-muted-foreground">min/km</span></p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {result.zones.map((z) => (
                <div key={z.id} className={`rounded-lg border-2 p-4 space-y-2 ${z.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-lg">{z.id}</span>
                    <Badge variant="outline" className="bg-background/60">PSE {z.pseMin}–{z.pseMax}</Badge>
                  </div>
                  <p className="text-sm font-medium leading-tight">{z.level}</p>
                  <div className="text-xs space-y-1">
                    <div>
                      <p className="text-muted-foreground">PACE (min/km)</p>
                      <p className="font-mono font-semibold">
                        {z.paceFastSec == null ? "Máx" : formatMmss(z.paceFastSec)} → {z.paceSlowSec == null ? "Máx" : formatMmss(z.paceSlowSec)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Esteira (km/h)</p>
                      <p className="font-mono font-semibold">
                        {z.velTo == null ? "Máx" : z.velTo.toFixed(1)} → {z.velFrom.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground border-t border-border/50 pt-2">"{z.phrase}"</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end items-center gap-3 flex-wrap">
              {!studentId && <p className="text-sm text-muted-foreground">Selecione um aluno acima para salvar este resultado.</p>}
              <Button variant="outline" onClick={handleExportPdf} disabled={exporting || !branding.data}>
                <FileDown /> {exporting ? "Gerando…" : "Exportar PDF"}
              </Button>
              <Button onClick={handleSalvar} disabled={saving || !studentId}><Save /> {saving ? "Salvando…" : "Salvar no perfil do aluno"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
