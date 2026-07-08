import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertCanManageStudentTraining, assertCanCustomizeStudentTraining } from "@/lib/company-permissions.server";

const ZoneEnum = z.enum(["Z1", "Z2", "Z3", "Z4", "Z5"]);
const DayEnum = z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]);

const SessionSchema = z.object({
  id: z.string().min(1).max(64),
  code: z.string().max(32),
  name: z.string().max(120),
  type: z.string().max(16),
  intensity: z.enum(["low", "moderate", "high"]),
  duration: z.number().int().nullable(),
  distance: z.number().int().nullable(),
  zones: z.object({ Z1: z.number(), Z2: z.number(), Z3: z.number(), Z4: z.number(), Z5: z.number() }),
  ratioL: z.number(),
  ratioMH: z.number(),
  description: z.string().max(2000),
  structure: z.array(z.object({
    id: z.string().max(64),
    phase: z.enum(["warmup", "main", "recovery"]),
    label: z.string().max(120),
    content: z.string().max(500),
    zone: ZoneEnum,
    durationSeconds: z.number().int().optional(),
    distanceMeters: z.number().int().optional(),
  })).max(40),
  isCustom: z.boolean(),
  tags: z.array(z.string().max(40)).max(20),
});

const WeekSchema = z.object({
  weekNumber: z.number().int(),
  days: z.object({
    SEG: SessionSchema.nullable(), TER: SessionSchema.nullable(), QUA: SessionSchema.nullable(),
    QUI: SessionSchema.nullable(), SEX: SessionSchema.nullable(), SAB: SessionSchema.nullable(),
    DOM: SessionSchema.nullable(),
  }),
  summary: z.object({
    totalVolumeKm: z.number(),
    totalDurationSeconds: z.number(),
    ratioL: z.number(),
    ratioMH: z.number(),
    zoneDistribution: z.object({ Z1: z.number(), Z2: z.number(), Z3: z.number(), Z4: z.number(), Z5: z.number() }),
  }),
});

async function fetchPlanForCoach(planId: string, userId: string) {
  const { data: plan, error } = await supabaseAdmin
    .from("training_plans")
    .select("id, coach_id, student_id, plan_type, payload, start_date, end_date")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!plan) throw new Response("Plano não encontrado", { status: 404 });
  await assertCanManageStudentTraining(plan.student_id, userId, true);
  return plan;
}

// Usado apenas pelo fluxo de "Personalizar" (getPlanCustomization, savePlanCustomization,
// savePlanWorkoutOverrides): qualquer membro da mesma empresa do aluno pode personalizar,
// sem exigir can_manage_training. updatePlanStartDate/updatePlanEndDate continuam usando
// fetchPlanForCoach (regra administrativa) — não é enfraquecida por esta função.
async function fetchPlanForCustomization(planId: string, userId: string) {
  const { data: plan, error } = await supabaseAdmin
    .from("training_plans")
    .select("id, coach_id, student_id, plan_type, payload")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!plan) throw new Response("Plano não encontrado", { status: 404 });
  await assertCanCustomizeStudentTraining(plan.student_id, userId);
  return plan;
}

export const getPlanCustomization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCustomization(data.planId, context.userId);
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, full_name, level, target_distance")
      .eq("id", plan.student_id)
      .single();
    return { plan, student };
  });

// ----- Workout overrides (Personalizar planilha — Fase/Semana/Treino) -----

const UnitEnum = z.enum(["min", "sec", "m"]);
const SingleSchema = z.object({
  kind: z.literal("single"),
  value: z.number().int().min(0).max(100000),
  unit: UnitEnum,
  zone: ZoneEnum,
});
const IntervalsSchema = z.object({
  kind: z.literal("intervals"),
  reps: z.number().int().min(1).max(50),
  on: SingleSchema,
  off: SingleSchema,
});
const TestSchema = z.object({
  kind: z.literal("test"),
  meters: z.number().int().min(100).max(100000),
  label: z.string().max(120),
  note: z.string().max(500).optional(),
});
const ItemSchema = z.discriminatedUnion("kind", [SingleSchema, IntervalsSchema, TestSchema]);
const SectionSchemaWO = z.object({
  name: z.enum(["warmup", "main", "recovery", "complement"]),
  items: z.array(ItemSchema).max(20),
});
const WorkoutPatchSchema = z.object({
  code: z.string().max(32).optional(),
  type: z.string().max(40).optional(),
  zones: z.array(ZoneEnum).max(5).optional(),
  sections: z.array(SectionSchemaWO).max(8).optional(),
  note: z.string().max(500).nullable().optional(),
});

const WorkoutSchema = z.object({
  code: z.string().min(1).max(32),
  defaultDay: z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]).optional(),
  type: z.string().max(40),
  zones: z.array(ZoneEnum).max(5),
  sections: z.array(SectionSchemaWO).max(8),
  note: z.string().max(500).optional(),
});

// Cada semana é um objeto cujas chaves são códigos originais (WorkoutPatch),
// com duas chaves reservadas: __removed (string[]) e __added (Workout[]).
const WeekOverrideSchema = z.record(
  z.string().max(32),
  z.union([
    WorkoutPatchSchema,
    z.array(z.string().max(32)).max(20),
    z.array(WorkoutSchema).max(14),
  ]),
);

const OverridesSchema = z.record(
  z.string().max(4),
  z.record(z.string().max(4), WeekOverrideSchema),
);

export const savePlanWorkoutOverrides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid(), overrides: OverridesSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCustomization(data.planId, context.userId);
    const basePayload = (plan.payload && typeof plan.payload === "object" ? plan.payload : {}) as Record<string, unknown>;
    const newPayload = {
      ...basePayload,
      workoutOverrides: data.overrides,
      workoutOverridesUpdatedAt: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("training_plans")
      .update({ payload: newPayload, updated_at: new Date().toISOString() })
      .eq("id", data.planId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

export const savePlanCustomization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid(), weeks: z.array(WeekSchema).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCustomization(data.planId, context.userId);
    const basePayload = (plan.payload && typeof plan.payload === "object" ? plan.payload : {}) as Record<string, unknown>;
    const newPayload = {
      ...basePayload,
      customization: { weeks: data.weeks, updatedAt: new Date().toISOString() },
    };
    const { error } = await supabaseAdmin
      .from("training_plans")
      .update({ payload: newPayload, updated_at: new Date().toISOString() })
      .eq("id", data.planId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

export const updatePlanStartDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      planId: z.string().uuid(),
      // ISO yyyy-mm-dd ou null para limpar
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCoach(data.planId, context.userId);
    if (data.startDate && plan.end_date && data.startDate > plan.end_date) {
      throw new Response("A data de início não pode ser posterior à data de término.", { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("training_plans")
      .update({ start_date: data.startDate, updated_at: new Date().toISOString() })
      .eq("id", data.planId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

export const updatePlanEndDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      planId: z.string().uuid(),
      // ISO yyyy-mm-dd ou null para limpar
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCoach(data.planId, context.userId);
    if (data.endDate && plan.start_date && data.endDate < plan.start_date) {
      throw new Response("A data de término não pode ser anterior à data de início.", { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("training_plans")
      .update({ end_date: data.endDate, updated_at: new Date().toISOString() })
      .eq("id", data.planId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });
