
REVOKE EXECUTE ON FUNCTION public.is_serene_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
