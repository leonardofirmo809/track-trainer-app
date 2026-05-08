import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DAY = z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]);

const configSchema = z.object({
  studentId: z.string().uuid(),
  level: z.union([z.literal(1), z.literal(2)]),
  daysPerWeek: z.number().int().min(1).max(7),
  weekDays: z.array(DAY).min(1).max(7),
  currentPhase: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

async function assertCanAccessStudent(userId: string, studentId: string) {
  const { data: student, error } = await supabaseAdmin
    .from("students").select("id, coach_id").eq("id", studentId).maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!student) throw new Response("Aluno não encontrado", { status: 404 });
  if (student.coach_id !== userId) {
    const { data: adminCheck } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!adminCheck) throw new Response("Forbidden", { status: 403 });
  }
  return student;
}

export const getPlanilha5kmData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const student = await assertCanAccessStudent(userId, data.studentId);

    // Último teste 3km do aluno (via admin para contornar RLS quando admin atua sobre coach diferente)
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
      .select("id, payload, status, plan_type, updated_at")
      .eq("student_id", data.studentId).eq("plan_type", "5km").eq("status", "ativa")
      .order("updated_at", { ascending: false }).limit(1);
    const plan = plans?.[0] ?? null;

    return { student: studentFull, coachId: student.coach_id, latestTest, plan };
  });

export const savePlanilha5kmConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const student = await assertCanAccessStudent(userId, data.studentId);

    const payload = {
      level: data.level,
      daysPerWeek: data.daysPerWeek,
      weekDays: data.weekDays,
      currentPhase: data.currentPhase,
    };

    const { data: existing } = await supabaseAdmin
      .from("training_plans")
      .select("id").eq("student_id", data.studentId).eq("plan_type", "5km").eq("status", "ativa")
      .order("updated_at", { ascending: false }).limit(1);

    if (existing?.[0]) {
      const { error } = await supabaseAdmin
        .from("training_plans")
        .update({ payload, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id);
      if (error) throw new Response(error.message, { status: 500 });
      return { id: existing[0].id };
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("training_plans")
        .insert({
          student_id: data.studentId,
          coach_id: student.coach_id,
          plan_type: "5km",
          status: "ativa",
          payload,
        })
        .select("id").single();
      if (error) throw new Response(error.message, { status: 500 });
      return { id: ins.id };
    }
  });
