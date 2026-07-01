import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workoutToFitBlob, type WorkoutForFit } from "@/lib/planilha-fit-export";
import { downloadBlob } from "@/lib/planilha-pdf-theme";
import { CheckCircle2, ChevronLeft, Download } from "lucide-react";

export type GarminSession = {
  sessionIdx: number;
  dayCode: string;
  dayLabel: string;
  workoutType: string;
  workout: WorkoutForFit;
};

export type GarminWeek = {
  weekNum: number;
  sessions: GarminSession[];
};

type Step = "main" | "pick" | "done";

type Props = {
  open: boolean;
  onClose: () => void;
  weeks: GarminWeek[];
  studentName: string;
  distance: string;
};

// Remove accents, lowercase, replace non-alphanumeric with hyphens
function toSlug(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildFitFilename(studentName: string, distance: string, weekNum: number, sessionIdx: number): string {
  const name = toSlug(studentName) || "aluno";
  const dist = toSlug(distance) || "treino";
  return `${name}-${dist}-semana-${String(weekNum).padStart(2, "0")}-treino-${String(sessionIdx).padStart(2, "0")}.fit`;
}

function triggerFit(studentName: string, distance: string, week: GarminWeek, sess: GarminSession): void {
  const filename = buildFitFilename(studentName, distance, week.weekNum, sess.sessionIdx);
  const wktName = filename.replace(/\.fit$/, "").slice(0, 15);
  downloadBlob(workoutToFitBlob(sess.workout, wktName), filename);
}

function SessionList({ sessions, onDownload }: {
  sessions: GarminSession[];
  onDownload: (sess: GarminSession) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {sessions.map((sess) => (
        <div
          key={sess.sessionIdx}
          className="flex items-center justify-between rounded-md border px-3 py-2.5 gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{sess.dayLabel}</p>
            <p className="text-xs text-muted-foreground truncate">{sess.workoutType}</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onDownload(sess)}>
            <Download className="mr-1 size-3.5" /> .FIT
          </Button>
        </div>
      ))}
    </div>
  );
}

export function GarminExportDialog({ open, onClose, weeks, studentName, distance }: Props) {
  const [weekIdx, setWeekIdx] = useState(0);
  const [step, setStep] = useState<Step>("main");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("main");
      setWeekIdx(0);
      setDownloading(false);
    }
  }, [open]);

  const week = weeks[weekIdx] ?? null;

  async function handleDownloadWeek() {
    if (!week) return;
    setDownloading(true);
    try {
      for (let i = 0; i < week.sessions.length; i++) {
        if (i > 0) await new Promise<void>((r) => setTimeout(r, 350));
        triggerFit(studentName, distance, week, week.sessions[i]);
      }
      setStep("done");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar para Garmin</DialogTitle>
        </DialogHeader>

        {weeks.length > 1 && step !== "done" && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">Semana:</span>
            <Select
              value={String(weekIdx)}
              onValueChange={(v) => { setWeekIdx(Number(v)); setStep("main"); }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((wk, i) => (
                  <SelectItem key={i} value={String(i)}>
                    Semana {wk.weekNum} — {wk.sessions.length} treino{wk.sessions.length !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === "main" && week && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cada arquivo <span className="font-mono text-foreground">.FIT</span> representa uma sessão de treino individual. Você quer baixar todos os treinos desta semana?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleDownloadWeek}
                disabled={downloading || week.sessions.length === 0}
              >
                <Download className="mr-2 size-4" />
                {downloading ? "Baixando…" : "Sim, baixar semana inteira"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("pick")}
                disabled={week.sessions.length === 0}
              >
                Não, escolher treino
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === "pick" && week && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Escolha o treino para baixar:</p>
            <SessionList
              sessions={week.sessions}
              onDownload={(sess) => triggerFit(studentName, distance, week, sess)}
            />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep("main")}>
              <ChevronLeft className="mr-1 size-4" /> Voltar
            </Button>
          </div>
        )}

        {step === "done" && week && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="text-sm font-medium">
                {week.sessions.length} arquivo{week.sessions.length !== 1 ? "s" : ""} enviado{week.sessions.length !== 1 ? "s" : ""} para download.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Se o navegador bloqueou algum download, baixe individualmente abaixo:
            </p>
            <SessionList
              sessions={week.sessions}
              onDownload={(sess) => triggerFit(studentName, distance, week, sess)}
            />
            <Button variant="outline" className="w-full" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
