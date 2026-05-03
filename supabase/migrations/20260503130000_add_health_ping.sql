/*
  Liveness ping for unauthenticated clients (login screen DB status).
  Tables like `admins` are not reliably readable with the anon role, so probing
  them always fails even when Postgres is awake. This function runs minimal SQL
  with elevated rights and EXECUTE granted only to anon/authenticated/service_role.
*/
CREATE OR REPLACE FUNCTION public.health_ping()
RETURNS smallint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 1::smallint;
$$;

REVOKE ALL ON FUNCTION public.health_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.health_ping() TO anon;
GRANT EXECUTE ON FUNCTION public.health_ping() TO authenticated;
GRANT EXECUTE ON FUNCTION public.health_ping() TO service_role;
