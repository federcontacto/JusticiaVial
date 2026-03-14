-- ══════════════════════════════════════════════
-- PASO A: LIMPIAR todo lo que se creó parcialmente
-- Pegá esto PRIMERO y ejecutá "Run"
-- ══════════════════════════════════════════════

-- Tablas (en orden inverso por dependencias)
DROP TABLE IF EXISTS case_events CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS nlp_keywords CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS insurers CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Vistas
DROP VIEW IF EXISTS leads_with_insurer CASCADE;
DROP VIEW IF EXISTS cases_full CASCADE;
DROP VIEW IF EXISTS pipeline_stats CASCADE;

-- Funciones
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS notify_new_lead() CASCADE;
DROP FUNCTION IF EXISTS log_case_stage_change() CASCADE;
DROP FUNCTION IF EXISTS search_leads(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;

-- ENUMs
DROP TYPE IF EXISTS plan_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS score_level CASCADE;
DROP TYPE IF EXISTS accident_type CASCADE;
DROP TYPE IF EXISTS case_stage CASCADE;
DROP TYPE IF EXISTS document_category CASCADE;
DROP TYPE IF EXISTS uploader_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;

-- Listo, ahora ejecutá el PASO B
-- ══════════════════════════════════════════════════════════════
-- JUSTICIAVIAL — Schema Completo para Supabase
-- ══════════════════════════════════════════════════════════════
-- 
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard → SQL Editor
-- 2. Pegar TODO este archivo
-- 3. Click en "Run"
-- 4. Verificar en Table Editor que se crearon las tablas
--
-- ══════════════════════════════════════════════════════════════


-- ═══════════════════════════════
-- 0. EXTENSIONES NECESARIAS
-- ═══════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════
-- 1. TIPOS ENUMERADOS (ENUMs)
-- ═══════════════════════════════

-- Planes de suscripción
CREATE TYPE plan_type AS ENUM ('trial', 'starter', 'profesional', 'enterprise');

-- Estado de suscripción
CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'suspended', 'cancelled');

-- Roles de usuario del estudio
CREATE TYPE user_role AS ENUM ('admin', 'abogado', 'asistente', 'readonly');

-- Estado del lead
CREATE TYPE lead_status AS ENUM ('nuevo', 'contactado', 'evaluacion', 'aceptado', 'rechazado');

-- Nivel de score
CREATE TYPE score_level AS ENUM ('alto', 'medio', 'bajo');

-- Tipo de siniestro
CREATE TYPE accident_type AS ENUM (
  'colision_vehicular', 'atropello_peaton', 'colision_moto', 
  'vuelco', 'choque_cadena', 'transporte_publico', 'otro'
);

-- Etapa del litigio
CREATE TYPE case_stage AS ENUM (
  'reclamo_extrajudicial', 'mediacion', 'demanda', 
  'prueba', 'alegatos', 'sentencia', 'ejecucion', 'cerrado'
);

-- Categoría de documento
CREATE TYPE document_category AS ENUM (
  'foto_siniestro', 'acta_policial', 'certificado_medico', 
  'recibo_sueldo', 'poliza_tercero', 'contrato', 'escrito_judicial',
  'pericia', 'sentencia_doc', 'otro'
);

-- Quién subió el documento
CREATE TYPE uploader_type AS ENUM ('lead', 'usuario');

-- Tipo de notificación
CREATE TYPE notification_type AS ENUM (
  'nuevo_lead', 'lead_alto', 'documento_subido', 
  'caso_actualizado', 'vencimiento', 'mensaje_wa', 'sistema'
);

-- Canal de notificación
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'push', 'interno');


-- ═══════════════════════════════
-- 2. TABLAS PRINCIPALES
-- ═══════════════════════════════

-- ────────────────────────────────
-- 2.1 TENANTS (Estudios Jurídicos)
-- ────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  plan          plan_type DEFAULT 'trial',
  subscription_status subscription_status DEFAULT 'trial',
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Datos de contacto
  phone         VARCHAR(30),
  email         VARCHAR(255),
  whatsapp      VARCHAR(20) NOT NULL,
  address       TEXT,
  city          VARCHAR(100),
  jurisdiction  VARCHAR(100) DEFAULT 'CABA',
  matricula     VARCHAR(100),
  
  -- Branding
  logo_url      TEXT,
  brand_colors  JSONB DEFAULT '{"primary":"#1B3A5C","accent":"#2E86AB"}'::jsonb,
  
  -- Configuración del calculador (editable desde admin)
  formula_config JSONB DEFAULT '{
    "coeficienteVuoto": 1.65,
    "edadJubilacion": 65,
    "porcentajeDanoMoral": 0.30,
    "coeficienteLucroCesante": 1.10,
    "porcentajeDanoEstetico": 0.08,
    "gastosMedicosCirugia": 350000,
    "gastosMedicosLeve": 120000,
    "factorMinimo": 0.70,
    "factorMaximo": 1.40,
    "tablaIncapacidad": {
      "sinLesiones": 0,
      "leve": 0.08,
      "moderada": 0.15,
      "grave": 0.30,
      "muyGrave": 0.50,
      "fallecimiento": 1.0
    }
  }'::jsonb,
  
  -- Configuración de scoring
  scoring_config JSONB DEFAULT '{
    "lesionesGraves": 15,
    "cirugia": 15,
    "aseguradoraIdentificada": 20,
    "terceroIdentificado": 15,
    "actaPolicial": 15,
    "ingresoAlto": 10,
    "edadProductiva": 5,
    "umbralIngresoAlto": 400000,
    "puntosPorDocumento": 5,
    "maxPuntosDocumentos": 20,
    "umbrales": { "alto": 75, "medio": 40 }
  }'::jsonb,
  
  -- Textos de la landing (editables desde admin)
  landing_texts JSONB DEFAULT '{
    "heroTitulo": "¿Tuviste un accidente de tránsito? Calculá cuánto te corresponde",
    "heroSubtitulo": "Recibí un estimado inmediato de tu indemnización basado en jurisprudencia argentina.",
    "heroCta": "Calcular mi indemnización",
    "disclaimer": "Este cálculo es orientativo y no constituye asesoramiento legal."
  }'::jsonb,
  
  -- Templates de WhatsApp
  wa_templates JSONB DEFAULT '{
    "leadCalculador": "Hola, usé el calculador y mi estimado es de {monto_min} a {monto_max}. Me llamo {nombre} y quiero asesoría.",
    "bienvenida": "Hola {nombre}, recibimos tu consulta con un estimado de {monto_min} a {monto_max}. ¿Podemos agendar una llamada?",
    "seguimiento": "Hola {nombre}, queríamos saber si pudiste revisar la información sobre tu caso."
  }'::jsonb,
  
  -- Metadata
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);


-- ────────────────────────────────
-- 2.2 USERS (Usuarios del Estudio)
-- ────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_id       UUID UNIQUE, -- Referencia a auth.users de Supabase
  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          user_role DEFAULT 'abogado',
  phone         VARCHAR(30),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_auth ON users(auth_id);


-- ────────────────────────────────
-- 2.3 ASEGURADORAS (Catálogo compartido)
-- ────────────────────────────────
CREATE TABLE insurers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL UNIQUE,
  cuit          VARCHAR(20),
  phone         VARCHAR(30),
  email         VARCHAR(255),
  website       TEXT,
  reputation_score INTEGER DEFAULT 50, -- 1-100, cuan difícil es litigar contra ellos
  notes         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────
-- 2.4 LEADS
-- ────────────────────────────────
CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Paso 1: Datos básicos (Lead Mínimo Viable)
  full_name           VARCHAR(255) NOT NULL,
  whatsapp            VARCHAR(20) NOT NULL,
  city                VARCHAR(100),
  
  -- Paso 2: Datos del calculador
  age                 INTEGER,
  monthly_income      DECIMAL(14,2),
  has_injuries        BOOLEAN,
  had_surgery         BOOLEAN,
  sick_days           INTEGER DEFAULT 0,
  has_third_party_data BOOLEAN,
  insurer_id          UUID REFERENCES insurers(id),
  insurer_name        VARCHAR(255), -- Backup si no matchea con el catálogo
  has_police_report   BOOLEAN,
  accident_type       accident_type,
  description         TEXT, -- Campo libre para análisis NLP
  
  -- Resultados del cálculo
  estimated_min       DECIMAL(14,2),
  estimated_max       DECIMAL(14,2),
  estimated_breakdown JSONB, -- Desglose: {incapacidad, lucro, moral, gastos, estetico}
  disability_pct      DECIMAL(5,2), -- Porcentaje de incapacidad estimado
  
  -- Scoring
  score_total         INTEGER DEFAULT 0,
  score_level         score_level DEFAULT 'bajo',
  score_breakdown     JSONB, -- {lesiones: 15, cirugia: 15, aseguradora: 20, ...}
  
  -- Análisis NLP
  nlp_keywords_found  JSONB, -- [{palabra, categoria, impacto}]
  nlp_score           INTEGER DEFAULT 0,
  
  -- Análisis IA (Claude/GPT)
  ai_summary          TEXT,
  ai_viability_pct    DECIMAL(5,2), -- 0-100%
  ai_risks            JSONB, -- ["riesgo 1", "riesgo 2"]
  ai_recommendation   TEXT,
  ai_analyzed_at      TIMESTAMPTZ,
  
  -- Estado y tracking
  status              lead_status DEFAULT 'nuevo',
  step_completed      INTEGER DEFAULT 1, -- 1, 2 o 3
  form_data_partial   JSONB, -- Datos parciales si abandonó
  
  -- Atribución
  source              VARCHAR(100) DEFAULT 'landing', -- landing, whatsapp, referido, manual
  utm_source          VARCHAR(100),
  utm_medium          VARCHAR(100),
  utm_campaign        VARCHAR(100),
  ip_address          INET,
  user_agent          TEXT,
  
  -- Contacto
  first_contacted_at  TIMESTAMPTZ,
  contacted_by        UUID REFERENCES users(id),
  
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_score ON leads(tenant_id, score_level);
CREATE INDEX idx_leads_created ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_insurer ON leads(insurer_id);

-- Índice GIN para búsqueda en descripción (full-text search)
CREATE INDEX idx_leads_description_search ON leads 
  USING gin(to_tsvector('spanish', COALESCE(description, '') || ' ' || COALESCE(full_name, '')));


-- ────────────────────────────────
-- 2.5 CASES (Casos Activos / Litigios)
-- ────────────────────────────────
CREATE TABLE cases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES leads(id),
  assigned_user_id    UUID REFERENCES users(id),
  
  -- Datos del caso
  case_title          VARCHAR(255), -- Ej: "Gómez c/ La Segunda s/ daños y perjuicios"
  stage               case_stage DEFAULT 'reclamo_extrajudicial',
  
  -- Contrato de representación
  contract_url        TEXT,
  contract_signed_at  TIMESTAMPTZ,
  contract_template   TEXT, -- Template usado
  
  -- Honorarios
  fee_type            VARCHAR(50) DEFAULT 'cuota_litis', -- cuota_litis, mixto, fijo
  fee_percentage      DECIMAL(5,2) DEFAULT 20.00, -- % de cuota litis
  fee_fixed_amount    DECIMAL(14,2), -- Monto fijo (si aplica)
  
  -- Datos judiciales (post-demanda)
  court_name          VARCHAR(255), -- Juzgado
  court_secretary     VARCHAR(255), -- Secretaría
  case_number         VARCHAR(100), -- Nro de expediente
  filing_date         DATE, -- Fecha de inicio de demanda
  
  -- Mediación
  mediation_date      DATE,
  mediation_result    VARCHAR(50), -- acuerdo, sin_acuerdo, incomparecencia
  mediation_notes     TEXT,
  
  -- Sentencia
  sentence_date       DATE,
  sentence_amount     DECIMAL(14,2),
  sentence_favorable  BOOLEAN,
  appeal_filed        BOOLEAN DEFAULT false,
  appeal_date         DATE,
  
  -- Ejecución y cobro
  collection_amount   DECIMAL(14,2), -- Monto efectivamente cobrado
  fee_collected       DECIMAL(14,2), -- Honorarios cobrados
  collection_date     DATE,
  
  -- Notas y seguimiento
  notes               TEXT,
  next_action         TEXT, -- Próxima acción requerida
  next_action_date    DATE, -- Fecha límite de la próxima acción
  
  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  closed_at           TIMESTAMPTZ
);

CREATE INDEX idx_cases_tenant ON cases(tenant_id);
CREATE INDEX idx_cases_stage ON cases(tenant_id, stage);
CREATE INDEX idx_cases_assigned ON cases(assigned_user_id);
CREATE INDEX idx_cases_lead ON cases(lead_id);
CREATE INDEX idx_cases_next_action ON cases(tenant_id, next_action_date) WHERE next_action_date IS NOT NULL;


-- ────────────────────────────────
-- 2.6 DOCUMENTS (Archivos)
-- ────────────────────────────────
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  case_id       UUID REFERENCES cases(id) ON DELETE SET NULL,
  
  file_name     VARCHAR(255) NOT NULL,
  file_url      TEXT NOT NULL, -- URL en Supabase Storage
  file_path     TEXT, -- Path completo en el bucket
  file_type     VARCHAR(100), -- MIME type
  file_size     INTEGER, -- Bytes
  
  category      document_category DEFAULT 'otro',
  description   TEXT,
  
  uploaded_by   uploader_type DEFAULT 'lead',
  uploaded_by_user_id UUID REFERENCES users(id),
  
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_lead ON documents(lead_id);
CREATE INDEX idx_documents_case ON documents(case_id);


-- ────────────────────────────────
-- 2.7 NLP_KEYWORDS (Diccionario editable por tenant)
-- ────────────────────────────────
CREATE TABLE nlp_keywords (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword       VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL, -- gravedad, incapacidad, fatal, agravante, evidencia, debilidad
  score_impact  INTEGER NOT NULL, -- Puede ser negativo
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, keyword)
);

CREATE INDEX idx_nlp_keywords_tenant ON nlp_keywords(tenant_id);


-- ────────────────────────────────
-- 2.8 NOTIFICATIONS
-- ────────────────────────────────
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  
  type          notification_type NOT NULL,
  channel       notification_channel DEFAULT 'interno',
  title         VARCHAR(255) NOT NULL,
  body          TEXT,
  
  -- Referencia al objeto relacionado
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);


-- ────────────────────────────────
-- 2.9 AUDIT_LOG (Registro de auditoría)
-- ────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  
  action        VARCHAR(50) NOT NULL, -- create, update, delete, login, export, view
  entity        VARCHAR(50) NOT NULL, -- lead, case, document, config, user
  entity_id     UUID,
  
  old_data      JSONB, -- Estado anterior (para updates)
  new_data      JSONB, -- Estado nuevo
  metadata      JSONB, -- IP, user agent, etc.
  
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);


-- ────────────────────────────────
-- 2.10 CASE_EVENTS (Timeline del caso)
-- ────────────────────────────────
CREATE TABLE case_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  
  event_type    VARCHAR(50) NOT NULL, -- stage_change, note, document, hearing, deadline
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  event_date    TIMESTAMPTZ DEFAULT NOW(),
  
  -- Para cambios de etapa
  from_stage    case_stage,
  to_stage      case_stage,
  
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_case_events_case ON case_events(case_id, created_at DESC);


-- ═══════════════════════════════
-- 3. FUNCIONES Y TRIGGERS
-- ═══════════════════════════════

-- ── Auto-update de updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Notificación automática cuando entra un lead nuevo ──
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  _user RECORD;
  _title TEXT;
BEGIN
  -- Determinar título según score
  IF NEW.score_level = 'alto' THEN
    _title := '🔴 LEAD PRIORITARIO: ' || NEW.full_name;
  ELSE
    _title := 'Nuevo lead: ' || NEW.full_name;
  END IF;

  -- Notificar a todos los usuarios activos del tenant
  FOR _user IN 
    SELECT id FROM users 
    WHERE tenant_id = NEW.tenant_id 
      AND is_active = true 
      AND role IN ('admin', 'abogado')
  LOOP
    INSERT INTO notifications (tenant_id, user_id, type, title, body, related_lead_id)
    VALUES (
      NEW.tenant_id,
      _user.id,
      CASE WHEN NEW.score_level = 'alto' THEN 'lead_alto' ELSE 'nuevo_lead' END,
      _title,
      'Score: ' || NEW.score_total || '/100 | Estimado: $' || 
        COALESCE(TO_CHAR(NEW.estimated_min, 'FM999G999G999'), '0') || ' - $' || 
        COALESCE(TO_CHAR(NEW.estimated_max, 'FM999G999G999'), '0') || 
        ' | ' || COALESCE(NEW.city, ''),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_new_lead();


-- ── Registrar cambio de etapa en case_events ──
CREATE OR REPLACE FUNCTION log_case_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO case_events (tenant_id, case_id, event_type, title, from_stage, to_stage)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      'stage_change',
      'Caso movido a: ' || NEW.stage::text,
      OLD.stage,
      NEW.stage
    );
    
    -- Si se cierra el caso, registrar fecha
    IF NEW.stage = 'cerrado' AND OLD.stage != 'cerrado' THEN
      NEW.closed_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_case_stage_change
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION log_case_stage_change();


-- ── Función: Buscar leads por texto (full-text search) ──
CREATE OR REPLACE FUNCTION search_leads(
  p_tenant_id UUID,
  p_query TEXT
)
RETURNS SETOF leads AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM leads
  WHERE tenant_id = p_tenant_id
    AND to_tsvector('spanish', COALESCE(description, '') || ' ' || COALESCE(full_name, ''))
        @@ plainto_tsquery('spanish', p_query)
  ORDER BY score_total DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Función: Estadísticas del dashboard ──
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id),
    'leads_este_mes', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND created_at >= date_trunc('month', NOW())),
    'leads_alto', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND score_level = 'alto'),
    'leads_nuevos', (SELECT COUNT(*) FROM leads WHERE tenant_id = p_tenant_id AND status = 'nuevo'),
    'score_promedio', (SELECT COALESCE(AVG(score_total), 0)::integer FROM leads WHERE tenant_id = p_tenant_id AND created_at >= date_trunc('month', NOW())),
    'monto_potencial_min', (SELECT COALESCE(SUM(estimated_min), 0) FROM leads WHERE tenant_id = p_tenant_id AND status IN ('nuevo', 'contactado', 'evaluacion')),
    'casos_activos', (SELECT COUNT(*) FROM cases WHERE tenant_id = p_tenant_id AND stage != 'cerrado'),
    'casos_en_demanda', (SELECT COUNT(*) FROM cases WHERE tenant_id = p_tenant_id AND stage = 'demanda'),
    'honorarios_potenciales', (SELECT COALESCE(SUM(sentence_amount * fee_percentage / 100), 0) FROM cases WHERE tenant_id = p_tenant_id AND stage != 'cerrado'),
    'notificaciones_sin_leer', (SELECT COUNT(*) FROM notifications n JOIN users u ON n.user_id = u.id WHERE n.tenant_id = p_tenant_id AND n.is_read = false)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════

-- Activar RLS en todas las tablas con tenant_id
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlp_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

-- ── Función helper: obtener tenant_id del usuario autenticado ──
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Función helper: obtener user_id del usuario autenticado ──
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Políticas para TENANTS ──
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = get_user_tenant_id());

CREATE POLICY "Admins can update their own tenant"
  ON tenants FOR UPDATE
  USING (id = get_user_tenant_id())
  WITH CHECK (id = get_user_tenant_id());

-- ── Políticas para USERS ──
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage users in their tenant"
  ON users FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para LEADS ──
-- SELECT: usuarios del tenant pueden ver leads de su tenant
CREATE POLICY "Users can view leads in their tenant"
  ON leads FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- INSERT: permitir inserciones públicas (desde la landing) y del tenant
CREATE POLICY "Public can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true); -- Se filtra por tenant_id en la API

CREATE POLICY "Users can update leads in their tenant"
  ON leads FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para CASES ──
CREATE POLICY "Users can view cases in their tenant"
  ON cases FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage cases in their tenant"
  ON cases FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para DOCUMENTS ──
CREATE POLICY "Users can view documents in their tenant"
  ON documents FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Public can insert documents for leads"
  ON documents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage documents in their tenant"
  ON documents FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete documents in their tenant"
  ON documents FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para NLP_KEYWORDS ──
CREATE POLICY "Users can view keywords in their tenant"
  ON nlp_keywords FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage keywords in their tenant"
  ON nlp_keywords FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para NOTIFICATIONS ──
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = get_current_user_id());

-- ── Políticas para AUDIT_LOG ──
CREATE POLICY "Users can view audit log of their tenant"
  ON audit_log FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- ── Políticas para CASE_EVENTS ──
CREATE POLICY "Users can view case events in their tenant"
  ON case_events FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create case events in their tenant"
  ON case_events FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());


-- ═══════════════════════════════
-- 5. STORAGE BUCKETS
-- ═══════════════════════════════
-- NOTA: Los buckets de Storage se crean mejor desde el Dashboard.
--       Ir a Storage → New Bucket y crear estos 3:
--
--   1. "lead-documents"  (Private, 15 MB max)
--   2. "case-documents"  (Private, 50 MB max)
--   3. "tenant-assets"   (Public,  5 MB max)
--
-- El siguiente bloque intenta crearlos por SQL.
-- Si falla, crealos manualmente desde el Dashboard.

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES 
    ('lead-documents', 'lead-documents', false, 15728640,
      ARRAY['image/jpeg','image/png','image/heic','image/webp','application/pdf']),
    ('case-documents', 'case-documents', false, 52428800,
      ARRAY['image/jpeg','image/png','application/pdf','application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('tenant-assets', 'tenant-assets', true, 5242880,
      ARRAY['image/jpeg','image/png','image/svg+xml','image/webp'])
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage buckets: crear manualmente desde Dashboard → Storage';
END $$;

-- Políticas de storage (envueltas para no romper si los buckets no existen)
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Public can upload lead documents"
      ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lead-documents');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Authenticated users can view lead documents"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Authenticated users can manage case documents"
      ON storage.objects FOR ALL
      USING (bucket_id = 'case-documents' AND auth.role() = 'authenticated');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Public can view tenant assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'tenant-assets');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY "Authenticated users can upload tenant assets"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'tenant-assets' AND auth.role() = 'authenticated');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ═══════════════════════════════
-- 6. DATOS INICIALES (SEED)
-- ═══════════════════════════════

-- ── Catálogo de aseguradoras argentinas ──
INSERT INTO insurers (name, cuit, reputation_score) VALUES
  ('La Segunda', '30-50004041-8', 65),
  ('Sancor Seguros', '30-50004044-2', 60),
  ('Federación Patronal', '30-50004058-2', 55),
  ('Mapfre Argentina', '30-50003892-7', 70),
  ('Zurich Argentina', '30-50003879-0', 72),
  ('Allianz Argentina', '30-50003680-0', 68),
  ('San Cristóbal', '30-50004043-4', 58),
  ('Rivadavia Seguros', '30-50004045-0', 55),
  ('La Holando', '30-50004050-7', 50),
  ('Meridional', '30-50004036-1', 52),
  ('La Caja', '30-50003900-2', 60),
  ('BBVA Seguros', '30-50003883-9', 65),
  ('HDI Seguros', '30-50003706-9', 62),
  ('Provincia Seguros', '30-99903208-5', 58),
  ('Orbis Seguros', '30-50003690-9', 50),
  ('SMG Seguros', '30-50003866-9', 48),
  ('Bernardino Rivadavia', '30-50004002-7', 52),
  ('Nación Seguros', '30-99903199-2', 55)
ON CONFLICT (name) DO NOTHING;


-- ── Tenant de ejemplo (borrar en producción) ──
INSERT INTO tenants (id, name, slug, whatsapp, email, phone, address, city, jurisdiction, matricula, plan, subscription_status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Estudio Rodríguez & Asociados',
  'rodriguez',
  '5491100000000',
  'consultas@estudiorodriguez.com.ar',
  '+54 11 0000-0000',
  'Av. Corrientes 1234, Piso 8',
  'CABA',
  'CABA',
  'Mat. CPACF T° 102 F° 345',
  'profesional',
  'active'
);

-- ── Keywords NLP iniciales para el tenant de ejemplo ──
INSERT INTO nlp_keywords (tenant_id, keyword, category, score_impact) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'fractura', 'gravedad', 20),
  ('a0000000-0000-0000-0000-000000000001', 'hospital', 'gravedad', 15),
  ('a0000000-0000-0000-0000-000000000001', 'cirugía', 'gravedad', 25),
  ('a0000000-0000-0000-0000-000000000001', 'internación', 'gravedad', 20),
  ('a0000000-0000-0000-0000-000000000001', 'coma', 'gravedad', 25),
  ('a0000000-0000-0000-0000-000000000001', 'amputación', 'gravedad', 25),
  ('a0000000-0000-0000-0000-000000000001', 'traumatismo', 'gravedad', 18),
  ('a0000000-0000-0000-0000-000000000001', 'yeso', 'gravedad', 10),
  ('a0000000-0000-0000-0000-000000000001', 'incapacidad', 'incapacidad', 20),
  ('a0000000-0000-0000-0000-000000000001', 'no puedo trabajar', 'incapacidad', 18),
  ('a0000000-0000-0000-0000-000000000001', 'licencia médica', 'incapacidad', 12),
  ('a0000000-0000-0000-0000-000000000001', 'baja laboral', 'incapacidad', 12),
  ('a0000000-0000-0000-0000-000000000001', 'fallecimiento', 'fatal', 30),
  ('a0000000-0000-0000-0000-000000000001', 'muerte', 'fatal', 30),
  ('a0000000-0000-0000-0000-000000000001', 'falleció', 'fatal', 30),
  ('a0000000-0000-0000-0000-000000000001', 'fuga', 'agravante', 15),
  ('a0000000-0000-0000-0000-000000000001', 'alcoholemia', 'agravante', 15),
  ('a0000000-0000-0000-0000-000000000001', 'exceso de velocidad', 'agravante', 10),
  ('a0000000-0000-0000-0000-000000000001', 'semáforo en rojo', 'agravante', 12),
  ('a0000000-0000-0000-0000-000000000001', 'testigos', 'evidencia', 10),
  ('a0000000-0000-0000-0000-000000000001', 'cámara', 'evidencia', 10),
  ('a0000000-0000-0000-0000-000000000001', 'filmación', 'evidencia', 10),
  ('a0000000-0000-0000-0000-000000000001', 'culpa mía', 'debilidad', -15),
  ('a0000000-0000-0000-0000-000000000001', 'no vi', 'debilidad', -10),
  ('a0000000-0000-0000-0000-000000000001', 'iba distraído', 'debilidad', -10);


-- ═══════════════════════════════
-- 7. VISTAS ÚTILES
-- ═══════════════════════════════

-- Vista: Leads con datos de aseguradora
CREATE OR REPLACE VIEW leads_with_insurer AS
SELECT 
  l.*,
  COALESCE(i.name, l.insurer_name, 'No identificada') AS insurer_display_name,
  i.reputation_score AS insurer_reputation
FROM leads l
LEFT JOIN insurers i ON l.insurer_id = i.id;

-- Vista: Casos con datos del lead y abogado
CREATE OR REPLACE VIEW cases_full AS
SELECT 
  c.*,
  l.full_name AS client_name,
  l.whatsapp AS client_whatsapp,
  l.city AS client_city,
  l.estimated_min,
  l.estimated_max,
  l.score_total AS lead_score,
  l.ai_summary AS lead_ai_summary,
  u.full_name AS assigned_lawyer_name,
  COALESCE(i.name, l.insurer_name) AS insurer_name
FROM cases c
JOIN leads l ON c.lead_id = l.id
LEFT JOIN users u ON c.assigned_user_id = u.id
LEFT JOIN insurers i ON l.insurer_id = i.id;

-- Vista: Pipeline stats por etapa
CREATE OR REPLACE VIEW pipeline_stats AS
SELECT 
  c.tenant_id,
  c.stage,
  COUNT(*) AS case_count,
  COALESCE(SUM(l.estimated_min), 0) AS total_estimated_min,
  COALESCE(SUM(l.estimated_max), 0) AS total_estimated_max,
  COALESCE(AVG(l.score_total), 0)::integer AS avg_score
FROM cases c
JOIN leads l ON c.lead_id = l.id
WHERE c.stage != 'cerrado'
GROUP BY c.tenant_id, c.stage;


-- ═══════════════════════════════
-- ✅ SCHEMA COMPLETADO
-- ═══════════════════════════════
-- 
-- Tablas creadas: 10
--   1. tenants (estudios jurídicos)
--   2. users (usuarios del estudio)
--   3. insurers (catálogo de aseguradoras)
--   4. leads (leads del calculador)
--   5. cases (casos/litigios activos)
--   6. documents (archivos adjuntos)
--   7. nlp_keywords (diccionario NLP editable)
--   8. notifications (sistema de alertas)
--   9. audit_log (registro de auditoría)
--  10. case_events (timeline del caso)
--
-- Funciones: 5
-- Triggers: 6
-- Políticas RLS: 16+
-- Storage Buckets: 3
-- Vistas: 3
-- Datos seed: 18 aseguradoras + 1 tenant ejemplo + 25 keywords
--
-- Próximo paso: Conectar el frontend con la API de Supabase
-- ═══════════════════════════════
