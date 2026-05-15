import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
    .select("id, coach_id, student_id, plan_type, payload")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!plan) throw new Response("Plano não encontrado", { status: 404 });
  if (plan.coach_id !== userId) {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });
  }
  return plan;
}

export const getPlanCustomization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ planId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCoach(data.planId, context.userId);
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, full_name, level, target_distance")
      .eq("id", plan.student_id)
      .single();
    return { plan, student };
  });

export const savePlanCustomization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid(), weeks: z.array(WeekSchema).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const plan = await fetchPlanForCoach(data.planId, context.userId);
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
