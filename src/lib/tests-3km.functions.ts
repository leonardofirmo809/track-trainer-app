import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const schema = z.object({
  studentId: z.string().uuid(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationSeconds: z.number().int().min(60).max(7200),
  ftpSecondsPerKm: z.number().positive(),
  baseSpeedKmh: z.number().positive(),
  source: z.enum(["3km", "5km", "10km", "cooper"]).optional().default("3km"),
  inputMeters: z.number().positive().nullable().optional(),
  zones: z.array(zoneSchema).length(5),
  notes: z.string().max(1000).optional().nullable(),
});

export const saveTeste3km = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Use supabaseAdmin to bypass RLS — permission is checked manually below.
    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id, coach_id, user_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Response(sErr.message, { status: 500 });
    if (!student) throw new Response("Aluno não encontrado.", { status: 404 });

    const isOwnCoach = student.coach_id === userId;
    const isOwnRunner = student.user_id === userId;
    if (!isOwnCoach && !isOwnRunner) {
      const { data: adminCheck } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!adminCheck) throw new Response("Forbidden", { status: 403 });
    }

    const { data: inserted, error: iErr } = await supabaseAdmin
      .from("tests")
      .insert({
        student_id: data.studentId,
        coach_id: student.coach_id,
        test_type: "3km",
        test_date: data.testDate,
        duration_seconds: data.durationSeconds,
        pace_seconds_per_km: Math.round(data.ftpSecondsPerKm),
        notes: data.notes ?? null,
        metadata: {
          ftp_seconds_per_km: data.ftpSecondsPerKm,
          base_speed_kmh: data.baseSpeedKmh,
          source: data.source ?? "3km",
          input_meters: data.inputMeters ?? null,
          zones: data.zones,
        },
      })
      .select("id")
      .single();
    if (iErr) throw new Response(iErr.message, { status: 500 });

    return { id: inserted.id };
  });
