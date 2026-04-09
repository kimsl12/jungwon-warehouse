-- Phase 11: User management — add email to profiles + admin role update RPC
-- ============================================================================

-- 1. Add email column to profiles (needed for user management page)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill email from auth.users for existing rows
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Update the auto-create trigger to also copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'user',
    new.email
  );
  RETURN new;
END;
$$;

-- 4. RPC for admin to change user role (avoids direct update ambiguity)
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  -- Validate role value
  IF p_new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  -- Prevent self-demotion (last admin safeguard)
  IF p_user_id = auth.uid() AND p_new_role = 'user' THEN
    IF (SELECT count(*) FROM profiles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'LAST_ADMIN';
    END IF;
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_user_id;

  -- Log the role change
  INSERT INTO activity_logs (user_id, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    'update',
    'profiles',
    p_user_id,
    jsonb_build_object('field', 'role', 'new_value', p_new_role)
  );
END;
$$;

COMMENT ON FUNCTION update_user_role IS '관리자가 사용자 역할을 변경. 마지막 관리자의 자기 강등 방지.';
