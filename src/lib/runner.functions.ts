import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const zoneSchema = z.object({
  id: z.enum(["Z1", "Z2", "Z3", "Z4", "Z5"]),
  level: z.string(),
  pseMin: z.number(),
  pseMax: z.number(),
  phrase: z.string(),
  pctFrom: z.number(),
  pctTo: z.number().nullable(),
  paceSlowSec: z.number().nullable(),
  paceFastSec: z.number().nullable(),
  velFrom: z.number(),
  velTo: z.number().nullable(),
});

const DistanceEnum = z.enum(["5km", "10km", "21km", "42km"]);
const LevelEnum = z.union([z.literal(1), z.literal(2)]);

const completeSchema = z.object({
  fullName: z.string().min(1).max(160),
  goalDistance: DistanceEnum,
  goalLevel: LevelEnum,
  raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  testSource: z.enum(["3km", "5km", "10km", "cooper"]),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationSeconds: z.number().int().min(60).max(7200),
  ftpSecondsPerKm: z.number().positive(),
  baseSpeedKmh: z.number().positive(),
  inputMeters: z.number().positive().nullable().optional(),
  zones: z.array(zoneSchema).length(5),
});

export const getRunnerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, goal_distance, goal_level, race_date, runner_onboarding_completed")
      .eq("id", userId)
      .maybeSingle();
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, full_name, level, target_distance")
      .eq("user_id", userId)
      .maybeSingle();

    let activePlan: { id: string; plan_type: string; payload: Json; created_at: string; start_date: string | null } | null = null;
    let lastTest: { id: string; test_date: string; pace_seconds_per_km: number | null; metadata: Json; test_type: string } | null = null;
    if (student) {
      const { data: plans } = await supabaseAdmin
        .from("training_plans")
        .select("id, plan_type, payload, created_at, start_date")
        .eq("student_id", student.id).eq("status", "ativa")
        .order("updated_at", { ascending: false }).limit(1);
      activePlan = plans?.[0] ?? null;
      const { data: tests } = await supabaseAdmin
        .from("tests")
        .select("id, test_date, pace_seconds_per_km, metadata, test_type")
        .eq("student_id", student.id)
        .order("test_date", { ascending: false }).limit(1);
      lastTest = tests?.[0] ?? null;
    }
    return { profile, student, activePlan, lastTest };
  });

export const getRunnerTestsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: student } = await supabaseAdmin
      .from("students").select("id").eq("user_id", userId).maybeSingle();
    if (!student) return { tests: [] };
    const { data: tests } = await supabaseAdmin
      .from("tests")
      .select("id, test_date, pace_seconds_per_km, metadata, test_type, duration_seconds")
      .eq("student_id", student.id)
      .order("test_date", { ascending: false });
    return { tests: tests ?? [] };
  });

export const archiveRunnerActivePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: student } = await supabaseAdmin
      .from("students").select("id").eq("user_id", userId).maybeSingle();
    if (!student) return { archived: 0 };
    const { data, error } = await supabaseAdmin
      .from("training_plans")
      .update({ status: "arquivada", updated_at: new Date().toISOString() })
      .eq("student_id", student.id).eq("status", "ativa")
      .select("id");
    if (error) throw new Response(error.message, { status: 500 });
    // Also clear onboarding flag so /corredor/onboarding wizard runs again
    await supabaseAdmin
      .from("profiles")
      .update({ runner_onboarding_completed: false })
      .eq("id", userId);
    return { archived: data?.length ?? 0 };
  });

export const completeRunnerOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => completeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Check role
    const { data: isRunner } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "runner" });
    if (!isRunner) throw new Response("Apenas corredores podem completar este onboarding.", { status: 403 });

    const levelEnum = data.goalLevel === 1 ? "iniciante" : "intermediario";

    // Find existing student for this runner
    const { data: existing } = await supabaseAdmin
      .from("students").select("id").eq("user_id", userId).maybeSingle();

    let studentId: string;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("students")
        .update({
          full_name: data.fullName,
          target_distance: data.goalDistance,
          level: levelEnum,
        })
        .eq("id", existing.id);
      if (error) throw new Response(error.message, { status: 500 });
      studentId = existing.id;
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("students")
        .insert({
          user_id: userId,
          coach_id: null,
          full_name: data.fullName,
          target_distance: data.goalDistance,
          level: levelEnum,
        })
        .select("id").single();
      if (error) throw new Response(error.message, { status: 500 });
      studentId = ins.id;
    }

    // Save test
    const { error: tErr } = await supabaseAdmin
      .from("tests")
      .insert({
        student_id: studentId,
        coach_id: null,
        test_type: data.testSource === "cooper" ? "outro" : data.testSource,
        test_date: data.testDate,
        duration_seconds: data.durationSeconds,
        pace_seconds_per_km: Math.round(data.ftpSecondsPerKm),
        metadata: {
          ftp_seconds_per_km: data.ftpSecondsPerKm,
          base_speed_kmh: data.baseSpeedKmh,
          source: data.testSource,
          input_meters: data.inputMeters ?? null,
          zones: data.zones,
        },
      });
    if (tErr) throw new Response(tErr.message, { status: 500 });

    // Update profile
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        goal_distance: data.goalDistance,
        goal_level: data.goalLevel,
        race_date: data.raceDate ?? null,
        runner_onboarding_completed: true,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (pErr) throw new Response(pErr.message, { status: 500 });

    return { studentId, goalDistance: data.goalDistance };
  });
