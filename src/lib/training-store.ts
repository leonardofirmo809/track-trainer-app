import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DayOfWeek, TrainingSession, WeekPlan } from "./training-session-types";
import { recalcSummary } from "./training-session-types";
import { sessionLibrary } from "./session-library";

interface TrainingStore {
  sessionLibrary: TrainingSession[];
  customSessions: TrainingSession[];
  prescription: { id: string; athleteId: string; weeks: WeekPlan[] };
  dirty: boolean;

  editorOpen: boolean;
  editorMode: "create" | "edit" | "view";
  editorSession: TrainingSession | null;
  editorTarget: { weekIndex: number; day: DayOfWeek } | null;

  libraryOpen: boolean;
  libraryTarget: { weekIndex: number; day: DayOfWeek } | null;

  history: WeekPlan[][];

  loadPrescription: (id: string, athleteId: string, weeks: WeekPlan[]) => void;
  markClean: () => void;

  addSession: (weekIndex: number, day: DayOfWeek, session: TrainingSession) => void;
  removeSession: (weekIndex: number, day: DayOfWeek) => void;
  swapSessions: (
    from: { weekIndex: number; day: DayOfWeek },
    to: { weekIndex: number; day: DayOfWeek },
  ) => void;
  moveSession: (
    from: { weekIndex: number; day: DayOfWeek },
    to: { weekIndex: number; day: DayOfWeek },
  ) => void;
  updateSession: (weekIndex: number, day: DayOfWeek, session: TrainingSession) => void;

  saveToLibrary: (session: TrainingSession) => void;
  deleteFromLibrary: (id: string) => void;

  openEditor: (
    mode: "create" | "edit" | "view",
    session?: TrainingSession,
    target?: { weekIndex: number; day: DayOfWeek },
  ) => void;
  closeEditor: () => void;
  openLibrary: (target?: { weekIndex: number; day: DayOfWeek }) => void;
  closeLibrary: () => void;

  undo: () => void;
}

function snapshotWeeks(weeks: WeekPlan[]): WeekPlan[] {
  return weeks.map((w) => ({ ...w, days: { ...w.days }, summary: { ...w.summary, zoneDistribution: { ...w.summary.zoneDistribution } } }));
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set, _get) => ({
      sessionLibrary,
      customSessions: [],
      prescription: { id: "", athleteId: "", weeks: [] },
      dirty: false,

      editorOpen: false,
      editorMode: "create",
      editorSession: null,
      editorTarget: null,

      libraryOpen: false,
      libraryTarget: null,

      history: [],

      loadPrescription: (id, athleteId, weeks) =>
        set({ prescription: { id, athleteId, weeks }, history: [], dirty: false }),

      markClean: () => set({ dirty: false }),

      addSession: (weekIndex, day, session) =>
        set((state) => {
          const weeks = snapshotWeeks(state.prescription.weeks);
          const newHistory = [...state.history, snapshotWeeks(state.prescription.weeks)].slice(-10);
          weeks[weekIndex].days[day] = session;
          weeks[weekIndex].summary = recalcSummary(weeks[weekIndex].days);
          return { prescription: { ...state.prescription, weeks }, history: newHistory, dirty: true };
        }),

      removeSession: (weekIndex, day) =>
        set((state) => {
          const weeks = snapshotWeeks(state.prescription.weeks);
          const newHistory = [...state.history, snapshotWeeks(state.prescription.weeks)].slice(-10);
          weeks[weekIndex].days[day] = null;
          weeks[weekIndex].summary = recalcSummary(weeks[weekIndex].days);
          return { prescription: { ...state.prescription, weeks }, history: newHistory, dirty: true };
        }),

      swapSessions: (from, to) =>
        set((state) => {
          const weeks = snapshotWeeks(state.prescription.weeks);
          const newHistory = [...state.history, snapshotWeeks(state.prescription.weeks)].slice(-10);
          const sessionA = weeks[from.weekIndex].days[from.day];
          const sessionB = weeks[to.weekIndex].days[to.day];
          weeks[from.weekIndex].days[from.day] = sessionB;
          weeks[to.weekIndex].days[to.day] = sessionA;
          weeks[from.weekIndex].summary = recalcSummary(weeks[from.weekIndex].days);
          if (from.weekIndex !== to.weekIndex)
            weeks[to.weekIndex].summary = recalcSummary(weeks[to.weekIndex].days);
          return { prescription: { ...state.prescription, weeks }, history: newHistory, dirty: true };
        }),

      moveSession: (from, to) =>
        set((state) => {
          const weeks = snapshotWeeks(state.prescription.weeks);
          const newHistory = [...state.history, snapshotWeeks(state.prescription.weeks)].slice(-10);
          const session = weeks[from.weekIndex].days[from.day];
          weeks[from.weekIndex].days[from.day] = null;
          weeks[to.weekIndex].days[to.day] = session;
          weeks[from.weekIndex].summary = recalcSummary(weeks[from.weekIndex].days);
          if (from.weekIndex !== to.weekIndex)
            weeks[to.weekIndex].summary = recalcSummary(weeks[to.weekIndex].days);
          return { prescription: { ...state.prescription, weeks }, history: newHistory, dirty: true };
        }),

      updateSession: (weekIndex, day, session) =>
        set((state) => {
          const weeks = snapshotWeeks(state.prescription.weeks);
          const newHistory = [...state.history, snapshotWeeks(state.prescription.weeks)].slice(-10);
          weeks[weekIndex].days[day] = session;
          weeks[weekIndex].summary = recalcSummary(weeks[weekIndex].days);
          return { prescription: { ...state.prescription, weeks }, history: newHistory, dirty: true };
        }),

      saveToLibrary: (session) =>
        set((state) => ({
          customSessions: [
            ...state.customSessions.filter((s) => s.id !== session.id),
            { ...session, isCustom: true },
          ],
        })),

      deleteFromLibrary: (id) =>
        set((state) => ({ customSessions: state.customSessions.filter((s) => s.id !== id) })),

      openEditor: (mode, session, target) =>
        set({
          editorOpen: true,
          editorMode: mode,
          editorSession: session ?? null,
          editorTarget: target ?? null,
        }),
      closeEditor: () => set({ editorOpen: false, editorSession: null, editorTarget: null }),
      openLibrary: (target) => set({ libraryOpen: true, libraryTarget: target ?? null }),
      closeLibrary: () => set({ libraryOpen: false, libraryTarget: null }),

      undo: () =>
        set((state) => {
          if (state.history.length === 0) return state;
          const prev = state.history[state.history.length - 1];
          return {
            prescription: { ...state.prescription, weeks: prev },
            history: state.history.slice(0, -1),
            dirty: true,
          };
        }),
    }),
    {
      name: "training-store-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      partialize: (state) => ({ customSessions: state.customSessions }),
    },
  ),
);

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
