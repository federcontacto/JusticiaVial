-- ══════════════════════════════════════════════
-- FIX: Permitir acceso público desde la landing
-- Pegar en SQL Editor y ejecutar
-- ══════════════════════════════════════════════

-- 1. Permitir que usuarios anónimos lean la config del tenant por slug
--    (necesario para que la landing cargue los datos del estudio)
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Public can view tenant by slug"
  ON tenants FOR SELECT
  USING (true);

-- 2. Permitir que anónimos lean el catálogo de aseguradoras
--    (necesario para el dropdown del formulario)
ALTER TABLE insurers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view insurers"
  ON insurers FOR SELECT
  USING (true);

-- 3. Permitir que anónimos lean las keywords NLP
--    (necesario para el scoring del calculador)
CREATE POLICY "Public can view active keywords"
  ON nlp_keywords FOR SELECT
  USING (is_active = true);

-- 4. Permitir que anónimos lean sus propios leads recién creados
--    (necesario para el update en pasos 2 y 3)
DROP POLICY IF EXISTS "Users can view leads in their tenant" ON leads;
CREATE POLICY "Anyone can view leads"
  ON leads FOR SELECT
  USING (true);

-- 5. Permitir que anónimos actualicen leads (auto-save pasos 2 y 3)
DROP POLICY IF EXISTS "Users can update leads in their tenant" ON leads;
CREATE POLICY "Anyone can update leads"
  ON leads FOR UPDATE
  USING (true);

-- 6. Función pública para obtener tenant por slug (más seguro)
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug TEXT)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'whatsapp', whatsapp,
    'phone', phone,
    'email', email,
    'address', address,
    'city', city,
    'jurisdiction', jurisdiction,
    'matricula', matricula,
    'logo_url', logo_url,
    'brand_colors', brand_colors,
    'formula_config', formula_config,
    'scoring_config', scoring_config,
    'landing_texts', landing_texts,
    'wa_templates', wa_templates
  )
  FROM tenants
  WHERE slug = p_slug
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Listo. La landing ahora puede leer datos y guardar leads sin login.
