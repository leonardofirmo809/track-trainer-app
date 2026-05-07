INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = lower('leonardofirmo809@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email) FROM auth.users WHERE lower(email) = lower('leonardofirmo809@gmail.com')
ON CONFLICT (id) DO NOTHING;