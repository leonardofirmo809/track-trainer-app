import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Save, Undo2, Plus, X, Pencil, Replace, GripVertical, Trash2, Sparkles } from "lucide-react";
import { QuickSwapPopover } from "@/components/prescricao/QuickSwapPopover";
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import {
  DAYS_OF_WEEK, DAY_LABELS, INTENSITY_CONFIG, SESSION_TYPE_LABELS,
  formatDistance, formatDuration, formatDurationHHMMSS, parseHHMMSS,
  autoCalcZonesFromBlocks,
  type DayOfWeek, type IntensityLevel, type SessionType, type StructureBlock, type TrainingSession,
} from "@/lib/training-session-types";
import { useTrainingStore, newSessionId } from "@/lib/training-store";
import { planPayloadToWeeks } from "@/lib/plan-to-weeks";
import { getPlanCustomization, savePlanCustomization } from "@/lib/plan-customization.functions";

export const Route = createFileRoute("/_authenticated/alunos/$studentId/prescricao/$planId")({
  component: PrescricaoPage,
});

function PrescricaoPage() {
  const { studentId, planId } = Route.useParams();
  const router = useRouter();
  const fetchPlan = useServerFn(getPlanCustomization);
  const savePlan = useServerFn(savePlanCustomization);

  const { data, isLoading } = useQuery({
    queryKey: ["plan-customization", planId],
    queryFn: () => fetchPlan({ data: { planId } }),
  });

  const store = useTrainingStore();
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Hydrate prescription from server when data arrives
  useEffect(() => {
    if (!data?.plan) return;
    const state = useTrainingStore.getState();
    if (state.prescription.id === planId) return;
    const weeks = planPayloadToWeeks(data.plan.payload, 4);
    state.loadPrescription(planId, studentId, weeks);
  }, [data?.plan, planId, studentId]);

  // Ctrl+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        store.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePlan({ data: { planId, weeks: store.prescription.weeks } });
      store.markClean();
      toast.success("Prescrição salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const from = e.active.data.current as { weekIndex: number; day: DayOfWeek } | undefined;
    const to = e.over?.data.current as { weekIndex: number; day: DayOfWeek } | undefined;
    if (!from || !to) return;
    if (from.weekIndex === to.weekIndex && from.day === to.day) return;
    const target = store.prescription.weeks[to.weekIndex]?.days[to.day];
    if (target) store.swapSessions(from, to);
    else store.moveSession(from, to);
  };

  if (isLoading || !data) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1">
            <Link to="/alunos/$studentId" params={{ studentId }}><ArrowLeft /> Voltar para o aluno</Link>
          </Button>
          <h1 className="text-2xl font-display font-bold">Personalizar prescrição</h1>
          <p className="text-sm text-muted-foreground">
            {data.student?.full_name} · {data.plan.plan_type?.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => store.undo()} disabled={store.history.length === 0}>
            <Undo2 /> Desfazer
          </Button>
          <Button variant="outline" size="sm" onClick={() => store.openLibrary()}>
            <Sparkles /> Biblioteca
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !store.dirty}>
            <Save /> {saving ? "Salvando…" : store.dirty ? "Salvar alterações" : "Salvo"}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="space-y-4">
          {store.prescription.weeks.map((week, weekIndex) => (
            <Card key={weekIndex}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg">Semana {week.weekNumber}</h2>
                  <WeekSummaryRow week={week} />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const session = week.days[day];
                    return (
                      <DayCell key={day} weekIndex={weekIndex} day={day} session={session} />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DndContext>

      <SessionLibrarySheet />
      <SessionEditorSheet />
    </div>
  );
}

/* ---------- WeekSummary ---------- */
function WeekSummaryRow({ week }: { week: { summary: { totalVolumeKm: number; totalDurationSeconds: number; ratioL: number; ratioMH: number; zoneDistribution: Record<string, number> } } }) {
  const s = week.summary;
  return (
    <div className="flex items-center gap-4 text-xs flex-wrap">
      <span><strong>{s.totalVolumeKm.toFixed(1)}</strong> km</span>
      <span><strong>{formatDuration(s.totalDurationSeconds)}</strong></span>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-24 rounded-full overflow-hidden bg-muted flex">
          <div className="bg-intensity-low-border" style={{ width: `${(s.ratioL * 100).toFixed(0)}%` }} />
          <div className="bg-intensity-high-border" style={{ width: `${(s.ratioMH * 100).toFixed(0)}%` }} />
        </div>
        <span className="text-muted-foreground">{(s.ratioL * 100).toFixed(0)}%L · {(s.ratioMH * 100).toFixed(0)}%M+H</span>
      </div>
    </div>
  );
}

/* ---------- DayCell (droppable) ---------- */
function DayCell({ weekIndex, day, session }: { weekIndex: number; day: DayOfWeek; session: TrainingSession | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${weekIndex}-${day}`, data: { weekIndex, day } });
  const openLibrary = useTrainingStore((s) => s.openLibrary);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[148px] rounded-lg border bg-card p-2 flex flex-col",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {DAY_LABELS[day]}
      </div>
      {session ? (
        <SessionDayCard weekIndex={weekIndex} day={day} session={session} />
      ) : (
        <button
          type="button"
          onClick={() => openLibrary({ weekIndex, day })}
          className="flex-1 rounded-md border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/30 flex items-center justify-center text-muted-foreground transition-colors"
        >
          <Plus className="size-5" />
        </button>
      )}
    </div>
  );
}

/* ---------- SessionDayCard (draggable) ---------- */
function SessionDayCard({ weekIndex, day, session }: { weekIndex: number; day: DayOfWeek; session: TrainingSession }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${weekIndex}-${day}`,
    data: { weekIndex, day },
  });
  const { openEditor, removeSession } = useTrainingStore();
  const [swapOpen, setSwapOpen] = useState(false);
  const cfg = INTENSITY_CONFIG[session.intensity];

  return (
    <QuickSwapPopover
      weekIndex={weekIndex}
      day={day}
      currentSessionId={session.id}
      open={swapOpen}
      onOpenChange={setSwapOpen}
    >
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        aria-label={`Trocar sessão de ${day}, semana ${weekIndex + 1}: ${session.code} ${session.name}`}
        onClick={() => setSwapOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSwapOpen(true);
          }
        }}
        className={cn(
          "group flex-1 rounded-md bg-background p-2 flex flex-col gap-1.5 text-xs cursor-pointer hover:ring-1 hover:ring-primary/40 transition-shadow",
          cfg.cardClass,
          isDragging && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Arrastar para outro dia"
          >
            <GripVertical className="size-3.5" />
          </button>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", cfg.badgeClass)}>{cfg.label}</Badge>
        </div>
        <div>
          <div className="font-bold leading-tight">{session.code}</div>
          <div className="text-muted-foreground text-[10px] leading-tight">{session.name}</div>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {session.duration ? formatDuration(session.duration) : formatDistance(session.distance)}
        </div>
        <div className="flex items-center gap-1 mt-auto pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            title="Editar sessão"
            onClick={(e) => { e.stopPropagation(); openEditor("edit", session, { weekIndex, day }); }}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            title="Trocar pela biblioteca"
            onClick={(e) => { e.stopPropagation(); setSwapOpen(true); }}
          >
            <Replace className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-destructive"
            title="Remover sessão"
            onClick={(e) => { e.stopPropagation(); removeSession(weekIndex, day); }}
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>
    </QuickSwapPopover>
  );
}

/* ---------- SessionLibrarySheet ---------- */
function SessionLibrarySheet() {
  const { libraryOpen, libraryTarget, closeLibrary, sessionLibrary, customSessions, addSession, openEditor, deleteFromLibrary } = useTrainingStore();
  const [intensity, setIntensity] = useState<IntensityLevel | "all">("all");
  const [typeFilter, setTypeFilter] = useState<SessionType | "all">("all");
  const [search, setSearch] = useState("");

  const all = useMemo(() => [...sessionLibrary, ...customSessions], [sessionLibrary, customSessions]);
  const filtered = all.filter((s) => {
    if (intensity !== "all" && s.intensity !== intensity) return false;
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (search && !`${s.code} ${s.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const types: (SessionType | "all")[] = ["all", "RE", "BA", "IAE", "LON", "PRO", "PRL", "TRU", "IAM", "CRL", "IAI", "IAL", "IMI", "SUB"];

  return (
    <Sheet open={libraryOpen} onOpenChange={(o) => !o && closeLibrary()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Biblioteca de sessões</SheetTitle>
          <SheetDescription>
            {libraryTarget ? `Escolha um treino para ${DAY_LABELS[libraryTarget.day]}, semana ${libraryTarget.weekIndex + 1}` : "Visualizar e editar a biblioteca"}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <Button className="w-full" onClick={() => openEditor("create", undefined, libraryTarget ?? undefined)}>
            <Plus /> Criar sessão do zero
          </Button>
          <Tabs value={intensity} onValueChange={(v) => setIntensity(v as IntensityLevel | "all")}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="low">LOW</TabsTrigger>
              <TabsTrigger value="moderate">MOD</TabsTrigger>
              <TabsTrigger value="high">HIGH</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn("text-[10px] px-2 py-1 rounded-md border", typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent")}
              >
                {t === "all" ? "TODOS" : t}
              </button>
            ))}
          </div>
          <Input placeholder="Buscar por código ou nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
          {filtered.map((s) => {
            const cfg = INTENSITY_CONFIG[s.intensity];
            return (
              <div key={s.id} className={cn("rounded-md border bg-card p-3 text-sm", cfg.cardClass)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{s.code}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", cfg.badgeClass)}>{cfg.label}</Badge>
                      {s.isCustom && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">CUSTOM</Badge>}
                    </div>
                    <div className="text-muted-foreground text-xs">{s.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-1">
                      {s.duration ? formatDuration(s.duration) : formatDistance(s.distance)} · {(s.ratioL * 100).toFixed(0)}%L
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {libraryTarget && (
                    <Button size="sm" onClick={() => { addSession(libraryTarget.weekIndex, libraryTarget.day, { ...s, id: newSessionId() }); closeLibrary(); }}>
                      Usar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEditor("edit", s)}>Ver/Editar</Button>
                  {s.isCustom && (
                    <Button size="icon" variant="ghost" className="text-destructive ml-auto size-7" onClick={() => deleteFromLibrary(s.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground p-6">Nenhuma sessão encontrada.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- SessionEditorSheet ---------- */
function SessionEditorSheet() {
  const { editorOpen, editorMode, editorSession, editorTarget, closeEditor, updateSession, saveToLibrary } = useTrainingStore();
  const [draft, setDraft] = useState<TrainingSession | null>(null);
  const [alsoSaveLibrary, setAlsoSaveLibrary] = useState(false);

  useEffect(() => {
    if (!editorOpen) { setDraft(null); return; }
    if (editorSession) {
      // Clone preset to a custom copy when editing in a target
      if (editorTarget && !editorSession.isCustom) {
        setDraft({ ...editorSession, id: newSessionId(), isCustom: true });
      } else {
        setDraft({ ...editorSession });
      }
    } else {
      setDraft({
        id: newSessionId(), code: "NEW1", name: "Nova sessão", type: "CUSTOM",
        intensity: "low", duration: 1800, distance: null,
        zones: { Z1: 1800, Z2: 0, Z3: 0, Z4: 0, Z5: 0 },
        ratioL: 1, ratioMH: 0, description: "",
        structure: [{ id: newSessionId(), phase: "main", label: "Treino Principal", content: "30min Z1", zone: "Z1", durationSeconds: 1800 }],
        isCustom: true, tags: [],
      });
    }
    setAlsoSaveLibrary(false);
  }, [editorOpen, editorSession, editorTarget]);

  if (!draft) return <Sheet open={editorOpen} onOpenChange={(o) => !o && closeEditor()}><SheetContent /></Sheet>;

  const update = (patch: Partial<TrainingSession>) => setDraft({ ...draft, ...patch });
  const updateBlock = (idx: number, patch: Partial<StructureBlock>) => {
    const blocks = [...draft.structure];
    blocks[idx] = { ...blocks[idx], ...patch };
    setDraft({ ...draft, structure: blocks });
  };
  const addBlock = () => setDraft({ ...draft, structure: [...draft.structure, { id: newSessionId(), phase: "main", label: "Bloco", content: "", zone: "Z2" }] });
  const removeBlock = (idx: number) => setDraft({ ...draft, structure: draft.structure.filter((_, i) => i !== idx) });
  const autoCalcZones = () => update({ zones: autoCalcZonesFromBlocks(draft.structure) });

  const handleSave = () => {
    if (editorTarget) {
      updateSession(editorTarget.weekIndex, editorTarget.day, draft);
      if (alsoSaveLibrary) saveToLibrary(draft);
      toast.success(alsoSaveLibrary ? "Aplicado e salvo na biblioteca" : "Aplicado ao dia");
    } else {
      saveToLibrary(draft);
      toast.success("Salvo na biblioteca");
    }
    closeEditor();
  };

  return (
    <Sheet open={editorOpen} onOpenChange={(o) => !o && closeEditor()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{editorMode === "create" ? "Nova sessão" : editorTarget ? "Personalizar treino do dia" : "Editar sessão"}</SheetTitle>
          <SheetDescription>Edite qualquer campo livremente. Auto-recalcula resumo da semana ao salvar.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código</Label><Input value={draft.code} onChange={(e) => update({ code: e.target.value })} /></div>
            <div><Label>Nome</Label><Input value={draft.name} onChange={(e) => update({ name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intensidade</Label>
              <ToggleGroup type="single" value={draft.intensity} onValueChange={(v) => v && update({ intensity: v as IntensityLevel })} className="justify-start">
                <ToggleGroupItem value="low">LOW</ToggleGroupItem>
                <ToggleGroupItem value="moderate">MOD</ToggleGroupItem>
                <ToggleGroupItem value="high">HIGH</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => update({ type: v as SessionType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duração total (HH:MM:SS)</Label>
              <Input
                value={formatDurationHHMMSS(draft.duration ?? 0)}
                onChange={(e) => update({ duration: parseHHMMSS(e.target.value) || null })}
              />
            </div>
            <div>
              <Label>Distância total (m)</Label>
              <Input type="number" value={draft.distance ?? ""} onChange={(e) => update({ distance: e.target.value ? parseInt(e.target.value, 10) : null })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Blocos de estrutura</Label>
              <Button size="sm" variant="outline" onClick={addBlock}><Plus /> Bloco</Button>
            </div>
            <div className="space-y-2">
              {draft.structure.map((b, idx) => (
                <div key={b.id} className="rounded-md border p-2 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label className="text-[10px]">Fase</Label>
                    <Select value={b.phase} onValueChange={(v) => updateBlock(idx, { phase: v as StructureBlock["phase"] })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warmup">Aquecimento</SelectItem>
                        <SelectItem value="main">Principal</SelectItem>
                        <SelectItem value="recovery">Recuperação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">Zona</Label>
                    <Select value={b.zone} onValueChange={(v) => updateBlock(idx, { zone: v as StructureBlock["zone"] })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Label className="text-[10px]">Conteúdo</Label>
                    <Input className="h-8" value={b.content} onChange={(e) => updateBlock(idx, { content: e.target.value })} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => removeBlock(idx)}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <div className="col-span-6">
                    <Label className="text-[10px]">Duração (s)</Label>
                    <Input type="number" className="h-8" value={b.durationSeconds ?? ""} onChange={(e) => updateBlock(idx, { durationSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                  </div>
                  <div className="col-span-6">
                    <Label className="text-[10px]">Distância (m)</Label>
                    <Input type="number" className="h-8" value={b.distanceMeters ?? ""} onChange={(e) => updateBlock(idx, { distanceMeters: e.target.value ? parseInt(e.target.value, 10) : undefined })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Zonas (segundos)</Label>
              <Button size="sm" variant="outline" onClick={autoCalcZones}><Sparkles /> Auto-calcular</Button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => (
                <div key={z}>
                  <Label className="text-[10px]">{z}</Label>
                  <Input type="number" className="h-8" value={draft.zones[z]} onChange={(e) => update({ zones: { ...draft.zones, [z]: parseInt(e.target.value, 10) || 0 } })} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>%Low</Label>
              <Input type="number" step="0.001" value={draft.ratioL} onChange={(e) => update({ ratioL: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>%M+H</Label>
              <Input type="number" step="0.001" value={draft.ratioMH} onChange={(e) => update({ ratioMH: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <Label>Tags (vírgula)</Label>
            <Input value={draft.tags.join(", ")} onChange={(e) => update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={draft.description} onChange={(e) => update({ description: e.target.value })} />
          </div>

          {editorTarget && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={alsoSaveLibrary} onChange={(e) => setAlsoSaveLibrary(e.target.checked)} />
              Salvar também na biblioteca
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" onClick={closeEditor}>Cancelar</Button>
          <Button onClick={handleSave}><Save /> Salvar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
