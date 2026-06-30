// Maps structured Workout objects → Garmin FIT Workout binary files.
// Works with all planilha distances (5km / 10km / 21km / 42km) because they
// share the same section/item shape.

import {
  generateFitWorkout,
  DUR_TIME, DUR_DISTANCE, DUR_REPEAT,
  TGT_OPEN,
  INT_ACTIVE, INT_COOLDOWN, INT_WARMUP,
  type FitWorkoutStep,
} from "@/lib/garmin-fit";

// ── Structural types (duck-typed to match all planilha Workout shapes) ────────

type ZoneStr = string;

type SingleItem  = { kind: "single";    value: number; unit: "min" | "sec" | "m"; zone: ZoneStr };
type Intervals   = { kind: "intervals"; reps: number;  on: SingleItem; off: SingleItem };
type TestItem    = { kind: "test";      meters: number; label: string };
type WorkoutItem = SingleItem | Intervals | TestItem;

type Section    = { name: string; items: WorkoutItem[] };

export type WorkoutForFit = {
  type:      string;
  sections:  Section[];
  note?:     string;
};

// ── Intensity mapping from section name ───────────────────────────────────────

const SECTION_INTENSITY: Record<string, number> = {
  warmup:     INT_WARMUP,
  main:       INT_ACTIVE,
  recovery:   INT_COOLDOWN,
  complement: INT_ACTIVE,
};

// ── Item → FIT step(s) ────────────────────────────────────────────────────────

function singleToStep(item: SingleItem, sectionName: string): FitWorkoutStep {
  const intensity = SECTION_INTENSITY[sectionName] ?? INT_ACTIVE;
  const zoneSuffix = ` ${item.zone}`;

  if (item.unit === "min") {
    return {
      name:          (`${item.value}min${zoneSuffix}`).slice(0, 15),
      durationType:  DUR_TIME,
      durationValue: item.value * 60 * 1000, // ms
      targetType:    TGT_OPEN,
      targetValue:   0,
      intensity,
    };
  }
  if (item.unit === "sec") {
    return {
      name:          (`${item.value}s${zoneSuffix}`).slice(0, 15),
      durationType:  DUR_TIME,
      durationValue: item.value * 1000, // ms
      targetType:    TGT_OPEN,
      targetValue:   0,
      intensity,
    };
  }
  // "m" — distance in centimeters (FIT stores distance as meters × 100)
  return {
    name:          (`${item.value}m${zoneSuffix}`).slice(0, 15),
    durationType:  DUR_DISTANCE,
    durationValue: item.value * 100,
    targetType:    TGT_OPEN,
    targetValue:   0,
    intensity,
  };
}

function workoutToFitSteps(wkt: WorkoutForFit): FitWorkoutStep[] {
  const steps: FitWorkoutStep[] = [];

  for (const section of wkt.sections) {
    for (const item of section.items) {
      if (item.kind === "single") {
        steps.push(singleToStep(item, section.name));
      } else if (item.kind === "intervals") {
        // Expand: [on_step, off_step, repeat_step]
        // The repeat step goes back to the on_step by referencing its index.
        const startIdx = steps.length;
        steps.push(singleToStep(item.on,  "main"));
        steps.push(singleToStep(item.off, "recovery"));
        steps.push({
          name:          `${item.reps}x`,
          durationType:  DUR_REPEAT,
          durationValue: startIdx, // step index to return to
          targetType:    TGT_OPEN,
          targetValue:   item.reps,
          intensity:     INT_ACTIVE,
        });
      } else {
        // kind === "test"
        steps.push({
          name:          item.label.slice(0, 15),
          durationType:  DUR_DISTANCE,
          durationValue: item.meters * 100,
          targetType:    TGT_OPEN,
          targetValue:   0,
          intensity:     INT_ACTIVE,
        });
      }
    }
  }

  return steps;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Converts a structured workout into a Garmin FIT Workout Blob. */
export function workoutToFitBlob(wkt: WorkoutForFit, workoutName: string): Blob {
  const steps = workoutToFitSteps(wkt);
  const data  = generateFitWorkout({ name: workoutName.slice(0, 15), steps });
  return new Blob([data], { type: "application/octet-stream" });
}
