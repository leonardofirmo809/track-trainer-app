-- 1) Admin can read all training_plans (matches pattern of students/tests admin policies)
CREATE POLICY "admins see all training_plans"
  ON public.training_plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Audit event values for role management
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'admin_added';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'admin_removed';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'coach_added';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'coach_removed';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'runner_added';
ALTER TYPE public.audit_event ADD VALUE IF NOT EXISTS 'runner_removed';
