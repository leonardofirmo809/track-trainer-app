import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, ChevronUp, ChevronDown, Save, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  type DayCode, type ZoneId, type Item, type Section, type SectionName, type Workout,
  DAY_LABEL, DAY_ORDER,
} from "@/lib/planilha-5km-data";
import type { DistributionResult, TypesMap } from "@/lib/planilha-5km-distribute";
import {
  type WorkoutOverrides, type WorkoutPatch,
  applyOverrides, getPatch, setOverride,
  getWeekPatches, getRemoved, getAdded, getManualDayMap, setWorkoutDay,
  removeWorkout, restoreRemovedWorkout,
  addWorkout, updateAddedWorkout, deleteAddedWorkout,
} from "@/lib/workout-overrides";
import { savePlanWorkoutOverrides } from "@/lib/plan-customization.functions";

type WorkoutLike = Workout & { defaultDay?: DayCode; slot?: number };

type Origin =
  | { kind: "original"; originalCode: string; edited: boolean }
  | { kind: "added"; index: number };

type EditingTarget =
  | { kind: "patch"; phase: number; weekIdx: number; original: WorkoutLike }
  | { kind: "added"; phase: number; weekIdx: number; index: number; workout: WorkoutLike }
  | { kind: "new"; phase: number; weekIdx: number };

export interface PlanilhaCustomizerSheetProps<TPhase extends number = number> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  initialOverrides: WorkoutOverrides;
  onSaved?: (overrides: WorkoutOverrides) => void;

  phases: TPhase[];
  initialPhase: TPhase;
  phaseLabels: Record<TPhase, { title: string; subtitle: string }>;

  /** Catálogo bruto (sem overrides) por fase: 4 semanas de Workout[]. */
  getRawPhaseWeeks: (phase: TPhase) => WorkoutLike[][];
  /** Distribui uma semana com tipos da planilha (5/10/21/42). Aceita opts (manualDayByCode). */
  distributeWeek: (
    workouts: WorkoutLike[],
    opts?: { manualDayByCode?: Record<string, DayCode | null | undefined>; noDrop?: boolean },
  ) => DistributionResult<WorkoutLike>;
  /** Dias selecionados pelo treinador (para o selector de dia). */
  selectedDays: DayCode[];

  workoutTypes: TypesMap;
  workoutTypesList: string[];
}

const ALL_ZONES: ZoneId[] = ["Z1", "Z2", "Z3", "Z4", "Z5"];
const SECTION_NAMES: SectionName[] = ["warmup", "main", "recovery", "complement"];
const SECTION_LABEL: Record<SectionName, string> = {
  warmup: "Aquecimento", main: "Treino Principal", recovery: "Recuperação", complement: "Complemento",
};

function applyPatch<T extends Workout>(wo: T, patch: WorkoutPatch | undefined): T {
  if (!patch) return wo;
  return {
    ...wo,
    ...(patch.code !== undefined ? { code: patch.code } : {}),
    ...(patch.type !== undefined ? { type: patch.type as T["type"] } : {}),
    ...(patch.zones !== undefined ? { zones: patch.zones as T["zones"] } : {}),
    ...(patch.sections !== undefined ? { sections: patch.sections } : {}),
    ...(patch.note !== undefined ? { note: patch.note ?? undefined } : {}),
  } as T;
}

function makeBlankWorkout(): Workout {
  return {
    code: "",
    defaultDay: "QUA",
    type: "Base aeróbia",
    zones: ["Z2"],
    sections: [{ name: "main", items: [{ kind: "single", value: 30, unit: "min", zone: "Z2" }] }],
  };
}

export function PlanilhaCustomizerSheet<TPhase extends number>(props: PlanilhaCustomizerSheetProps<TPhase>) {
  const {
    open, onOpenChange, planId, initialOverrides, onSaved,
    phases, initialPhase, phaseLabels,
    getRawPhaseWeeks, distributeWeek, selectedDays,
    workoutTypes, workoutTypesList,
  } = props;

  const saveFn = useServerFn(savePlanWorkoutOverrides);
  const [overrides, setOverridesState] = useState<WorkoutOverrides>(initialOverrides);
  const [phase, setPhase] = useState<TPhase>(initialPhase);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync quando o sheet abre
  useEffect(() => {
    if (open) {
      setOverridesState(initialOverrides);
      setPhase(initialPhase);
      setDirty(false);
    }
  }, [open, initialOverrides, initialPhase]);

  // Semanas patcheadas + distribuídas para a fase atual
  const weeks = useMemo(() => {
    const raw = getRawPhaseWeeks(phase);
    const phaseOverrides = overrides[String(phase)] ?? {};
    return raw.map((rawList, w) => {
      const weekObj = phaseOverrides[String(w)];
      const patches = getWeekPatches(weekObj);
      const removedSet = new Set(getRemoved(weekObj));
      const added = getAdded(weekObj);

      const kept: { workout: WorkoutLike; origin: Origin }[] = rawList
        .filter((wo) => !removedSet.has(wo.code))
        .map((wo) => ({
          workout: applyPatch(wo, patches[wo.code]) as WorkoutLike,
          origin: { kind: "original", originalCode: wo.code, edited: !!patches[wo.code] },
        }));
      const addedTagged: { workout: WorkoutLike; origin: Origin }[] = added.map((wo, i) => ({
        workout: wo as WorkoutLike,
        origin: { kind: "added", index: i },
      }));
      const all = [...kept, ...addedTagged];
      const manualDayByCode = getManualDayMap(weekObj, rawList);
      const dist = distributeWeek(all.map((x) => x.workout), { manualDayByCode, noDrop: true });
      const originByCode = new Map<string, Origin>(all.map((x) => [x.workout.code, x.origin]));
      const removedOriginals = rawList.filter((wo) => removedSet.has(wo.code));
      return { dist, originByCode, removedOriginals };
    });
  }, [phase, overrides, getRawPhaseWeeks, distributeWeek]);

  function changeWorkoutDay(p: TPhase, weekIdx: number, origin: Origin, day: DayCode | null) {
    if (origin.kind === "original") {
      setOverridesState((cur) => setWorkoutDay(cur, p, weekIdx, origin.originalCode, day));
    } else {
      // added: muda defaultDay diretamente
      setOverridesState((cur) => {
        const phaseObj = cur[String(p)] ?? {};
        const weekObj = phaseObj[String(weekIdx)] ?? {};
        const added = (weekObj.__added ?? []).slice();
        const wo = added[origin.index];
        if (!wo) return cur;
        if (day === null) {
          // Para adicionados sem dia, usamos um valor fora dos selecionados
          // mas mantemos defaultDay para não quebrar tipos. Marcamos via "DOM" se livre.
          // Solução: apenas removemos (visualmente cai em unassigned) trocando defaultDay
          // para um marcador especial não suportado. Mais simples: mantemos defaultDay = "QUA"
          // e o usuário precisa atribuir um dia explicitamente.
          added[origin.index] = { ...wo, defaultDay: "QUA" as DayCode };
        } else {
          added[origin.index] = { ...wo, defaultDay: day };
        }
        return updateAddedWorkout(cur, p, weekIdx, origin.index, added[origin.index]);
      });
    }
    setDirty(true);
  }

  function applyEdit(patch: WorkoutPatch | null) {
    if (!editing || editing.kind !== "patch") return;
    setOverridesState((cur) => setOverride(cur, editing.phase, editing.weekIdx, editing.original.code, patch));
    setDirty(true);
    setEditing(null);
  }

  function applyAddedEdit(workout: Workout) {
    if (!editing || editing.kind !== "added") return;
    setOverridesState((cur) => updateAddedWorkout(cur, editing.phase, editing.weekIdx, editing.index, workout));
    setDirty(true);
    setEditing(null);
  }

  function applyNew(workout: Workout) {
    if (!editing || editing.kind !== "new") return;
    setOverridesState((cur) => addWorkout(cur, editing.phase, editing.weekIdx, workout).overrides);
    setDirty(true);
    setEditing(null);
  }

  function deleteAdded() {
    if (!editing || editing.kind !== "added") return;
    setOverridesState((cur) => deleteAddedWorkout(cur, editing.phase, editing.weekIdx, editing.index));
    setDirty(true);
    setEditing(null);
  }

  function handleRemoveCard(p: TPhase, weekIdx: number, origin: Origin) {
    if (origin.kind === "original") {
      setOverridesState((cur) => removeWorkout(cur, p, weekIdx, origin.originalCode));
    } else {
      setOverridesState((cur) => deleteAddedWorkout(cur, p, weekIdx, origin.index));
    }
    setDirty(true);
  }

  function handleRestore(p: TPhase, weekIdx: number, originalCode: string) {
    setOverridesState((cur) => restoreRemovedWorkout(cur, p, weekIdx, originalCode));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: { planId, overrides } });
      toast.success("Personalizações salvas.");
      setDirty(false);
      onSaved?.(overrides);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : (e as Error).message;
      toast.error(`Falha ao salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[1100px] overflow-y-auto p-6 space-y-4">
        <SheetHeader>
          <SheetTitle>Personalizar planilha</SheetTitle>
          <SheetDescription>
            Edite, adicione ou remova treinos. As mudanças são aplicadas à planilha do aluno após salvar.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={String(phase)} onValueChange={(v) => setPhase(Number(v) as TPhase)}>
          <TabsList>
            {phases.map((p) => (
              <TabsTrigger key={p} value={String(p)}>{phaseLabels[p]?.title ?? `Fase ${p}`}</TabsTrigger>
            ))}
          </TabsList>
          {phases.map((p) => (
            <TabsContent key={p} value={String(p)} className="space-y-6">
              <p className="text-sm text-muted-foreground">{phaseLabels[p]?.subtitle}</p>
              {phase === p && weeks.map((wk, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">Semana {idx + 1}</p>
                    {wk.dist.unassigned.length > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300">
                        {wk.dist.unassigned.length} treino(s) sem dia atribuído
                      </Badge>
                    )}
                  </div>

                  {/* Bandeja de treinos sem dia */}
                  {wk.dist.unassigned.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        Treinos sem dia — atribua um dia abaixo:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {wk.dist.unassigned.map((u) => {
                          const origin = wk.originByCode.get(u.code);
                          if (!origin) return null;
                          return (
                            <div
                              key={u.code}
                              className={`rounded-md border-2 p-2 text-xs flex items-center gap-2 ${workoutTypes[u.type]?.color ?? ""}`}
                            >
                              <div className="min-w-0">
                                <p className="font-semibold leading-tight">{u.type}</p>
                                <p className="text-[10px] opacity-80">{u.code}</p>
                              </div>
                              <Select
                                value=""
                                onValueChange={(v) => changeWorkoutDay(p, idx, origin, v as DayCode)}
                              >
                                <SelectTrigger className="h-7 text-xs w-[110px]">
                                  <SelectValue placeholder="Dia…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedDays.map((d) => (
                                    <SelectItem key={d} value={d}>{DAY_LABEL[d]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                    {wk.dist.assignments.map((a) => {
                      const origin = a.workout ? wk.originByCode.get(a.workout.code) : null;
                      const isEdited = origin?.kind === "original" && origin.edited;
                      const isAdded = origin?.kind === "added";
                      return (
                        <div key={a.day}>
                          {a.workout && origin ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (origin.kind === "original") {
                                    const raw = getRawPhaseWeeks(p)[idx]
                                      .find((w) => w.code === origin.originalCode);
                                    if (raw) setEditing({ kind: "patch", phase: p, weekIdx: idx, original: raw });
                                  } else {
                                    setEditing({ kind: "added", phase: p, weekIdx: idx, index: origin.index, workout: a.workout! });
                                  }
                                }}
                                className={`w-full text-left rounded-md border-2 p-3 hover:opacity-90 transition ${workoutTypes[a.workout.type]?.color ?? ""}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold">{DAY_LABEL[a.day]}</span>
                                  <span className="text-[10px] opacity-80 truncate max-w-[60%]">{a.workout.code}</span>
                                </div>
                                <p className="text-sm font-semibold leading-tight">{a.workout.type}</p>
                                <p className="text-[11px] opacity-80 mt-1">{a.workout.zones.join(" / ")}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {isEdited && <Badge variant="secondary" className="text-[9px]">editado</Badge>}
                                  {isAdded && <Badge variant="secondary" className="text-[9px]">novo</Badge>}
                                </div>
                              </button>
                              {/* Selector para mover para outro dia */}
                              <div className="mt-1">
                                <Select
                                  value={a.day}
                                  onValueChange={(v) => changeWorkoutDay(p, idx, origin, v === "__none" ? null : (v as DayCode))}
                                >
                                  <SelectTrigger className="h-7 text-[11px] w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedDays.map((d) => (
                                      <SelectItem key={d} value={d}>Mover para {DAY_LABEL[d]}</SelectItem>
                                    ))}
                                    <SelectItem value="__none">Sem dia</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                type="button"
                                aria-label="Remover treino"
                                onClick={(e) => { e.stopPropagation(); handleRemoveCard(p, idx, origin); }}
                                className="absolute top-1 right-1 rounded-full bg-background/80 hover:bg-background border p-1 shadow-sm"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
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

                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <Button
                      type="button" size="sm" variant="outline"
                      onClick={() => setEditing({ kind: "new", phase: p, weekIdx: idx })}
                    >
                      <Plus /> Adicionar treino
                    </Button>
                    {wk.removedOriginals.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
                        <span>Removidos:</span>
                        {wk.removedOriginals.map((wo) => (
                          <Button
                            key={wo.code} type="button" size="sm" variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleRestore(p, idx, wo.code)}
                          >
                            <RotateCcw className="h-3 w-3" /> {wo.code}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          {dirty && <span className="text-xs text-muted-foreground">Mudanças não salvas</span>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            <Save /> {saving ? "Salvando…" : "Salvar personalizações"}
          </Button>
        </div>

        {editing && editing.kind === "patch" && (
          <WorkoutEditorDialog
            mode="patch"
            title={`Editar treino — ${editing.original.code}`}
            initial={editing.original}
            currentPatch={getPatch(overrides, editing.phase, editing.weekIdx, editing.original.code)}
            workoutTypesList={workoutTypesList}
            onCancel={() => setEditing(null)}
            onSavePatch={applyEdit}
          />
        )}
        {editing && editing.kind === "added" && (
          <WorkoutEditorDialog
            mode="added"
            title={`Editar treino — ${editing.workout.code || "(novo)"}`}
            initial={editing.workout}
            workoutTypesList={workoutTypesList}
            onCancel={() => setEditing(null)}
            onSaveWorkout={applyAddedEdit}
            onDelete={deleteAdded}
          />
        )}
        {editing && editing.kind === "new" && (
          <WorkoutEditorDialog
            mode="new"
            title="Novo treino"
            initial={makeBlankWorkout()}
            workoutTypesList={workoutTypesList}
            onCancel={() => setEditing(null)}
            onSaveWorkout={applyNew}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- Editor de um único Workout ----------

type EditorMode = "patch" | "added" | "new";

function WorkoutEditorDialog(props: {
  mode: EditorMode;
  title: string;
  initial: WorkoutLike;
  currentPatch?: WorkoutPatch | undefined;
  workoutTypesList: string[];
  onCancel: () => void;
  onSavePatch?: (patch: WorkoutPatch | null) => void;
  onSaveWorkout?: (workout: Workout) => void;
  onDelete?: () => void;
}) {
  const { mode, title, initial, currentPatch, workoutTypesList, onCancel, onSavePatch, onSaveWorkout, onDelete } = props;

  const merged: Workout = mode === "patch"
    ? ({
        ...initial,
        ...(currentPatch?.code !== undefined ? { code: currentPatch.code } : {}),
        ...(currentPatch?.type !== undefined ? { type: currentPatch.type as Workout["type"] } : {}),
        ...(currentPatch?.zones !== undefined ? { zones: currentPatch.zones as ZoneId[] } : {}),
        ...(currentPatch?.sections !== undefined ? { sections: currentPatch.sections } : {}),
        ...(currentPatch?.note !== undefined ? { note: currentPatch.note ?? undefined } : {}),
      } as Workout)
    : (initial as Workout);

  const [code, setCode] = useState(merged.code);
  const [type, setType] = useState<string>(merged.type);
  const [zones, setZones] = useState<ZoneId[]>(merged.zones);
  const [sections, setSections] = useState<Section[]>(merged.sections);
  const [note, setNote] = useState<string>(merged.note ?? "");

  function toggleZone(z: ZoneId) {
    setZones((cur) => cur.includes(z) ? cur.filter((x) => x !== z) : [...cur, z].sort((a, b) => ALL_ZONES.indexOf(a) - ALL_ZONES.indexOf(b)));
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    setSections((cur) => cur.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function moveSection(idx: number, dir: -1 | 1) {
    setSections((cur) => {
      const next = [...cur];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function addSection() {
    setSections((cur) => [...cur, { name: "main", items: [] }]);
  }
  function removeSection(idx: number) {
    setSections((cur) => cur.filter((_, i) => i !== idx));
  }
  function addItem(sIdx: number, kind: Item["kind"]) {
    const newItem: Item =
      kind === "single" ? { kind: "single", value: 5, unit: "min", zone: "Z2" } :
      kind === "intervals" ? { kind: "intervals", reps: 4, on: { kind: "single", value: 1, unit: "min", zone: "Z4" }, off: { kind: "single", value: 1, unit: "min", zone: "Z1" } } :
      { kind: "test", meters: 3000, label: "TESTE" };
    updateSection(sIdx, { items: [...sections[sIdx].items, newItem] });
  }
  function updateItem(sIdx: number, iIdx: number, item: Item) {
    updateSection(sIdx, { items: sections[sIdx].items.map((it, i) => i === iIdx ? item : it) });
  }
  function removeItem(sIdx: number, iIdx: number) {
    updateSection(sIdx, { items: sections[sIdx].items.filter((_, i) => i !== iIdx) });
  }

  function buildWorkout(): Workout | null {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Informe um código para o treino.");
      return null;
    }
    return {
      code: trimmed,
      defaultDay: (initial as WorkoutLike).defaultDay ?? "QUA",
      type: type as Workout["type"],
      zones,
      sections,
      ...(note ? { note } : {}),
    };
  }

  function handleSave() {
    if (mode === "patch") {
      const original = initial;
      const patch: WorkoutPatch = {};
      if (code !== original.code) patch.code = code;
      if (type !== original.type) patch.type = type;
      if (JSON.stringify(zones) !== JSON.stringify(original.zones)) patch.zones = zones;
      if (JSON.stringify(sections) !== JSON.stringify(original.sections)) patch.sections = sections;
      if ((note || "") !== (original.note ?? "")) patch.note = note || null;
      onSavePatch?.(Object.keys(patch).length === 0 ? null : patch);
    } else {
      const wo = buildWorkout();
      if (!wo) return;
      onSaveWorkout?.(wo);
    }
  }

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto p-6 space-y-5">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Personalize código, tipo, zonas e blocos deste treino.</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Código</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={32} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {workoutTypesList.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Zonas</Label>
          <div className="flex gap-2 mt-1">
            {ALL_ZONES.map((z) => (
              <Button key={z} type="button" size="sm" variant={zones.includes(z) ? "default" : "outline"} onClick={() => toggleZone(z)}>
                {z}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label>Observação</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Blocos</Label>
            <Button type="button" size="sm" variant="outline" onClick={addSection}><Plus /> Bloco</Button>
          </div>
          {sections.map((sct, sIdx) => (
            <div key={sIdx} className="rounded-md border p-3 space-y-2 bg-card/50">
              <div className="flex items-center gap-2">
                <Select value={sct.name} onValueChange={(v) => updateSection(sIdx, { name: v as SectionName })}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTION_NAMES.map((n) => <SelectItem key={n} value={n}>{SECTION_LABEL[n]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(sIdx, -1)}><ChevronUp /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveSection(sIdx, 1)}><ChevronDown /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeSection(sIdx)}><Trash2 /></Button>
                </div>
              </div>
              <div className="space-y-2">
                {sct.items.map((it, iIdx) => (
                  <ItemEditor
                    key={iIdx}
                    item={it}
                    onChange={(next) => updateItem(sIdx, iIdx, next)}
                    onRemove={() => removeItem(sIdx, iIdx)}
                  />
                ))}
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem(sIdx, "single")}><Plus /> Bloco simples</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem(sIdx, "intervals")}><Plus /> Intervalado</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addItem(sIdx, "test")}><Plus /> Teste</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          {mode === "patch" && currentPatch ? (
            <Button type="button" variant="outline" onClick={() => onSavePatch?.(null)}>
              <RotateCcw /> Restaurar original
            </Button>
          ) : mode === "added" && onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 /> Excluir treino
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="button" onClick={handleSave}>{mode === "new" ? "Adicionar" : "Aplicar"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------- Editor de um Item ----------

function ItemEditor({ item, onChange, onRemove }: {
  item: Item; onChange: (next: Item) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded border p-2 bg-background">
      <div className="flex items-center gap-2 mb-2">
        <Select value={item.kind} onValueChange={(v) => {
          const k = v as Item["kind"];
          if (k === item.kind) return;
          if (k === "single") onChange({ kind: "single", value: 5, unit: "min", zone: "Z2" });
          else if (k === "intervals") onChange({ kind: "intervals", reps: 4, on: { kind: "single", value: 1, unit: "min", zone: "Z4" }, off: { kind: "single", value: 1, unit: "min", zone: "Z1" } });
          else onChange({ kind: "test", meters: 3000, label: "TESTE" });
        }}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Simples</SelectItem>
            <SelectItem value="intervals">Intervalado</SelectItem>
            <SelectItem value="test">Teste</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="icon" variant="ghost" className="ml-auto" onClick={onRemove}><Trash2 /></Button>
      </div>

      {item.kind === "single" && (
        <SingleFields item={item} onChange={onChange} />
      )}

      {item.kind === "intervals" && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Repetições</Label>
            <Input
              type="number" min={1} max={50}
              value={item.reps}
              onChange={(e) => onChange({ ...item, reps: Math.max(1, parseInt(e.target.value || "1", 10)) })}
              className="h-8 max-w-[100px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border p-2">
              <p className="text-xs font-bold mb-1">ON</p>
              <SingleFields item={item.on} onChange={(s) => onChange({ ...item, on: s as typeof item.on })} />
            </div>
            <div className="rounded border p-2">
              <p className="text-xs font-bold mb-1">OFF</p>
              <SingleFields item={item.off} onChange={(s) => onChange({ ...item, off: s as typeof item.off })} />
            </div>
          </div>
        </div>
      )}

      {item.kind === "test" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Metros</Label>
            <Input type="number" min={100} value={item.meters}
              onChange={(e) => onChange({ ...item, meters: parseInt(e.target.value || "0", 10) })}
              className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Etiqueta</Label>
            <Input value={item.label} maxLength={120}
              onChange={(e) => onChange({ ...item, label: e.target.value })}
              className="h-8" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Nota</Label>
            <Input value={item.note ?? ""} maxLength={500}
              onChange={(e) => onChange({ ...item, note: e.target.value || undefined })}
              className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
}

function SingleFields({ item, onChange }: { item: Extract<Item, { kind: "single" }>; onChange: (next: Item) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-xs">Valor</Label>
        <Input type="number" min={0} value={item.value}
          onChange={(e) => onChange({ ...item, value: parseInt(e.target.value || "0", 10) })}
          className="h-8" />
      </div>
      <div>
        <Label className="text-xs">Unidade</Label>
        <Select value={item.unit} onValueChange={(v) => onChange({ ...item, unit: v as typeof item.unit })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="min">min</SelectItem>
            <SelectItem value="sec">seg</SelectItem>
            <SelectItem value="m">m</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Zona</Label>
        <Select value={item.zone} onValueChange={(v) => onChange({ ...item, zone: v as ZoneId })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALL_ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
