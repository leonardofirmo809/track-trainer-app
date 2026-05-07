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
import { Home, ChevronRight, Save, Calculator, FileDown } from "lucide-react";
import {
  calcularTeste3km, formatMmss, parseMmss,
  TEST_MIN_SECONDS, TEST_MAX_SECONDS, type Teste3kmResult,
} from "@/lib/teste-3km";
import { saveTeste3km } from "@/lib/tests-3km.functions";
import { useCoachBranding } from "@/lib/use-coach-branding";
import { generateTeste3kmPdf, downloadPdf } from "@/lib/teste-3km-pdf";

export const Route = createFileRoute("/_authenticated/teste-3km")({ component: Teste3kmPage });

function Teste3kmPage() {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveTeste3km);

  const [studentId, setStudentId] = useState<string>("");
  const [tempo, setTempo] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Teste3kmResult | null>(null);
  const [saving, setSaving] = useState(false);

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
    // máscara mm:ss
    const digits = v.replace(/\D/g, "").slice(0, 4);
    let masked = digits;
    if (digits.length >= 3) masked = `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
    setTempo(masked);
  }

  function handleLimpar() {
    setStudentId("");
    setTempo("");
    setResult(null);
    setError(null);
  }

  function handleCalcular() {
    setError(null);
    setResult(null);
    let secs: number;
    try { secs = parseMmss(tempo); } catch (e) { setError((e as Error).message); return; }
    if (secs < TEST_MIN_SECONDS || secs > TEST_MAX_SECONDS) {
      setError("Tempo deve estar entre 10:00 e 40:00 para um teste de 3km."); return;
    }
    setResult(calcularTeste3km(secs));
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
          zones: result.zones.map((z) => ({
            id: z.id, level: z.level, pseMin: z.pseMin, pseMax: z.pseMax, phrase: z.phrase,
            pctFrom: z.pctFrom, pctTo: z.pctTo,
            paceSlowSec: z.paceSlowSec, paceFastSec: z.paceFastSec,
            velFrom: z.velFrom, velTo: z.velTo,
          })),
        },
      });
      toast.success(`Teste salvo no perfil de ${studentName}`);
      qc.invalidateQueries({ queryKey: ["tests", studentId] });
      setResult(null);
      setTempo("");
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link to="/dashboard" className="flex items-center gap-1 hover:text-foreground"><Home className="size-3.5" /> Início</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Teste de 3KM</span>
        </nav>
        <h1 className="text-3xl font-display font-bold">Teste de 3KM</h1>
        <p className="text-muted-foreground">Avalie a performance do aluno e gere o FTP e as zonas de treino.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do teste</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label htmlFor="aluno">Aluno (opcional)</Label>
            <Select value={studentId || "__none__"} onValueChange={(v) => setStudentId(v === "__none__" ? "" : v)}>
              <SelectTrigger id="aluno"><SelectValue placeholder={students.isLoading ? "Carregando…" : "Nenhum (teste avulso)"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum (teste avulso) —</SelectItem>
                {students.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tempo">Tempo do teste (mm:ss) *</Label>
            <Input id="tempo" inputMode="numeric" placeholder="Ex: 17:42" value={tempo} onChange={(e) => handleTempoChange(e.target.value)} maxLength={5} />
          </div>
          <div>
            <Label htmlFor="data">Data do teste</Label>
            <Input id="data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {error && <div className="md:col-span-3 text-sm text-destructive">{error}</div>}
          <div className="md:col-span-3 flex gap-2">
            <Button onClick={handleCalcular}><Calculator /> Calcular</Button>
            <Button variant="outline" onClick={handleLimpar}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Resultado</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{studentId ? <>Aluno: <span className="font-medium text-foreground">{studentName}</span></> : <span className="font-medium text-foreground">Teste avulso</span>} • Tempo: <span className="font-medium text-foreground">{formatMmss(result.durationSeconds)}</span></p>
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
            <div className="flex justify-end items-center gap-3">
              {!studentId && <p className="text-sm text-muted-foreground">Selecione um aluno acima para salvar este resultado.</p>}
              <Button onClick={handleSalvar} disabled={saving || !studentId}><Save /> {saving ? "Salvando…" : "Salvar no perfil do aluno"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
