import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertCanManageStudentTraining } from "@/lib/company-permissions.server";

const DAY = z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]);

const configSchema = z.object({
  studentId: z.string().uuid(),
  level: z.union([z.literal(1), z.literal(2)]),
  weekDays: z.array(DAY).min(1).max(7),
  currentPhase: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  // ISO yyyy-mm-dd. Omitido = não altera end_date (update) / sem término definido (insert).
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getPlanilha10kmData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const student = await assertCanManageStudentTraining(data.studentId, userId, true);

    const { data: tests } = await supabaseAdmin
      .from("tests")
      .select("id, test_date, duration_seconds, pace_seconds_per_km, metadata")
      .eq("student_id", data.studentId).eq("test_type", "3km")
      .order("test_date", { ascending: false }).limit(1);
    const latestTest = tests?.[0] ?? null;

    const { data: studentFull } = await supabaseAdmin
      .from("students").select("id, full_name, level").eq("id", data.studentId).single();

    const { data: plans } = await supabaseAdmin
      .from("training_plans")
      .select("id, payload, status, plan_type, updated_at, created_at, start_date, end_date")
      .eq("student_id", data.studentId).eq("plan_type", "10km").eq("status", "ativa")
      .order("updated_at", { ascending: false }).limit(1);
    const plan = plans?.[0] ?? null;

    return { student: studentFull, coachId: student.coach_id, latestTest, plan };
  });

export const savePlanilha10kmConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const student = await assertCanManageStudentTraining(data.studentId, userId, true);

    const { data: existing } = await supabaseAdmin
      .from("training_plans")
      .select("id, payload, start_date").eq("student_id", data.studentId).eq("plan_type", "10km").eq("status", "ativa")
      .order("updated_at", { ascending: false }).limit(1);

    if (data.endDate && existing?.[0]?.start_date && data.endDate < existing[0].start_date) {
      throw new Response("A data de término não pode ser anterior à data de início.", { status: 400 });
    }

    const existingPayload =
      existing?.[0]?.payload && typeof existing[0].payload === "object" && !Array.isArray(existing[0].payload)
        ? (existing[0].payload as Record<string, unknown>)
        : {};

    const payload = {
      ...existingPayload,
      level: data.level,
      weekDays: data.weekDays,
      currentPhase: data.currentPhase,
    };

    if (existing?.[0]) {
      const { error } = await supabaseAdmin
        .from("training_plans")
        .update({
          payload,
          updated_at: new Date().toISOString(),
          ...(data.endDate !== undefined ? { end_date: data.endDate } : {}),
        })
        .eq("id", existing[0].id);
      if (error) throw new Response(error.message, { status: 500 });
      return { id: existing[0].id };
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("training_plans")
        .insert({
          student_id: data.studentId,
          coach_id: student.coach_id,
          plan_type: "10km",
          status: "ativa",
          payload,
          end_date: data.endDate ?? null,
        })
        .select("id").single();
      if (error) throw new Response(error.message, { status: 500 });
      return { id: ins.id };
    }
  });
