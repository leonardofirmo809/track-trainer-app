
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
-- get_invite_by_token must remain callable (intentional public lookup), but revoke from public role
REVOKE EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon, authenticated;
