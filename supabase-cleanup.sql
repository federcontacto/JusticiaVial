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
