-- Phase 10: Product aliases (별칭) for enhanced search
-- product_aliases table + search_products RPC + RLS policies

-- =============================================================================
-- 1. product_aliases table
-- =============================================================================
CREATE TABLE product_aliases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alias      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, alias)
);

COMMENT ON TABLE product_aliases IS '품목별 검색용 별칭 (별명, 약어 등)';

CREATE INDEX product_aliases_product_id_idx ON product_aliases(product_id);
CREATE INDEX product_aliases_alias_idx ON product_aliases(alias);

-- =============================================================================
-- 2. RLS policies
-- =============================================================================
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read aliases (needed for search)
CREATE POLICY "Authenticated users can read aliases"
  ON product_aliases FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert aliases
CREATE POLICY "Admins can insert aliases"
  ON product_aliases FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete aliases
CREATE POLICY "Admins can delete aliases"
  ON product_aliases FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- 3. Activity log trigger for product_aliases
-- =============================================================================
CREATE OR REPLACE FUNCTION log_product_alias_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action text;
  v_record_id uuid;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action   := 'create';
    v_record_id := NEW.product_id;
    v_details  := jsonb_build_object(
      'alias_id', NEW.id,
      'alias', NEW.alias,
      'product_id', NEW.product_id
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action   := 'delete';
    v_record_id := OLD.product_id;
    v_details  := jsonb_build_object(
      'alias_id', OLD.id,
      'alias', OLD.alias,
      'product_id', OLD.product_id
    );
  END IF;

  INSERT INTO activity_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), v_action, 'product_aliases', v_record_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_product_aliases_activity
  AFTER INSERT OR DELETE ON product_aliases
  FOR EACH ROW EXECUTE FUNCTION log_product_alias_activity();

-- =============================================================================
-- 4. search_products RPC — searches name + aliases in one query
-- =============================================================================
CREATE OR REPLACE FUNCTION search_products(
  p_query    text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.*
  FROM products p
  WHERE (
    p_query IS NULL OR p_query = ''
    OR p.name ILIKE '%' || p_query || '%'
    OR EXISTS (
      SELECT 1 FROM product_aliases pa
      WHERE pa.product_id = p.id
        AND pa.alias ILIKE '%' || p_query || '%'
    )
  )
  AND (p_category IS NULL OR p.category = p_category)
  ORDER BY p.name;
$$;

COMMENT ON FUNCTION search_products IS '제품명 + 별칭 동시 검색. 재고 페이지 및 모바일 스캔에서 사용.';
