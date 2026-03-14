/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Supabase API Client
   ══════════════════════════════════════════════
   
   Este archivo conecta el frontend con Supabase.
   
   CONFIGURAR:
   1. Reemplazar SUPABASE_URL con tu URL de proyecto
   2. Reemplazar SUPABASE_ANON_KEY con tu anon key
   
   ══════════════════════════════════════════════ */

// ══════════════════════════════════════════
// 🔧 CONFIGURAR ESTAS DOS VARIABLES
// ══════════════════════════════════════════
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
// ══════════════════════════════════════════

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

const JV_API = {

  // ══════════════════════════════════════════
  // LEADS — Operaciones públicas (landing)
  // ══════════════════════════════════════════

  /**
   * Crear o actualizar un lead (auto-save desde el calculador)
   * Se llama en cada paso del formulario
   */
  async saveLead(tenantSlug, leadData, stepCompleted) {
    const sb = getSupabase();
    
    // Obtener tenant_id desde el slug
    const { data: tenant, error: tenantError } = await sb
      .from('tenants')
      .select('id, formula_config, scoring_config')
      .eq('slug', tenantSlug)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant no encontrado:', tenantSlug);
      return { error: 'Estudio no encontrado' };
    }

    // Preparar datos del lead
    const lead = {
      tenant_id: tenant.id,
      full_name: leadData.nombre,
      whatsapp: leadData.whatsapp,
      city: leadData.ciudad,
      step_completed: stepCompleted,
      source: leadData.source || 'landing',
      utm_source: leadData.utm_source || null,
      utm_medium: leadData.utm_medium || null,
      utm_campaign: leadData.utm_campaign || null,
    };

    // Agregar datos del paso 2 si están disponibles
    if (stepCompleted >= 2) {
      lead.age = leadData.edad || null;
      lead.monthly_income = leadData.ingreso || null;
      lead.has_injuries = leadData.lesiones;
      lead.had_surgery = leadData.cirugia;
      lead.sick_days = leadData.diasBaja || 0;
      lead.has_third_party_data = leadData.tercero;
      lead.insurer_name = leadData.aseguradora || null;
      lead.has_police_report = leadData.actaPolicial;
      lead.accident_type = mapAccidentType(leadData.tipoSiniestro);
      lead.description = leadData.descripcion || null;
    }

    // Calcular estimación e insertar
    if (stepCompleted >= 2) {
      const resultado = JV_ENGINE.calcularIndemnizacion(leadData);
      lead.estimated_min = resultado.minimo;
      lead.estimated_max = resultado.maximo;
      lead.estimated_breakdown = resultado.desglose;
      lead.disability_pct = resultado.porcentajeIncapacidad;

      const scoring = JV_ENGINE.calcularScore(leadData);
      lead.score_total = scoring.total;
      lead.score_level = scoring.nivel;
      lead.score_breakdown = scoring.desglose;
      lead.nlp_keywords_found = scoring.nlpDetalle.matches;
      lead.nlp_score = scoring.nlpDetalle.puntos;
    }

    // Guardar datos parciales si el formulario está incompleto
    if (stepCompleted < 3) {
      lead.form_data_partial = leadData;
    }

    // Si ya tenemos un lead_id en el state, actualizamos
    if (leadData._leadId) {
      const { data, error } = await sb
        .from('leads')
        .update(lead)
        .eq('id', leadData._leadId)
        .select()
        .single();

      return error ? { error } : { data };
    }

    // Sino, creamos nuevo lead
    const { data, error } = await sb
      .from('leads')
      .insert(lead)
      .select()
      .single();

    return error ? { error } : { data };
  },

  /**
   * Subir documento de un lead
   */
  async uploadLeadDocument(tenantId, leadId, file) {
    const sb = getSupabase();
    const fileName = `${tenantId}/${leadId}/${Date.now()}_${file.name}`;

    // Subir archivo al storage
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('lead-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        contentType: file.type,
      });

    if (uploadError) return { error: uploadError };

    // Obtener URL pública
    const { data: urlData } = sb.storage
      .from('lead-documents')
      .getPublicUrl(fileName);

    // Registrar en tabla documents
    const { data, error } = await sb
      .from('documents')
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        category: guessDocumentCategory(file.name),
        uploaded_by: 'lead',
      })
      .select()
      .single();

    return error ? { error } : { data };
  },

  /**
   * Obtener configuración del tenant (para la landing pública)
   */
  async getTenantConfig(slug) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('tenants')
      .select(`
        id, name, slug, whatsapp, phone, email, address, city,
        jurisdiction, matricula, logo_url, brand_colors,
        formula_config, scoring_config, landing_texts, wa_templates
      `)
      .eq('slug', slug)
      .single();

    return error ? { error } : { data };
  },

  /**
   * Obtener keywords NLP del tenant
   */
  async getNLPKeywords(tenantId) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('nlp_keywords')
      .select('keyword, category, score_impact')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    return error ? { error } : { data };
  },

  // ══════════════════════════════════════════
  // DASHBOARD — Operaciones autenticadas
  // ══════════════════════════════════════════

  /**
   * Login con email y password
   */
  async login(email, password) {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error } : { data };
  },

  /**
   * Logout
   */
  async logout() {
    const sb = getSupabase();
    await sb.auth.signOut();
  },

  /**
   * Obtener sesión actual
   */
  async getSession() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  /**
   * Obtener datos del usuario logueado
   */
  async getCurrentUser() {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data } = await sb
      .from('users')
      .select('*, tenants(*)')
      .eq('auth_id', user.id)
      .single();

    return data;
  },

  /**
   * Obtener estadísticas del dashboard
   */
  async getDashboardStats(tenantId) {
    const sb = getSupabase();
    const { data, error } = await sb.rpc('get_dashboard_stats', {
      p_tenant_id: tenantId
    });
    return error ? { error } : { data };
  },

  /**
   * Obtener leads con filtros
   */
  async getLeads(tenantId, { status, scoreLevel, page = 1, limit = 20, search } = {}) {
    const sb = getSupabase();
    let query = sb
      .from('leads')
      .select('*, insurers(name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);
    if (scoreLevel) query = query.eq('score_level', scoreLevel);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    return error ? { error } : { data, count };
  },

  /**
   * Obtener detalle de un lead
   */
  async getLeadDetail(leadId) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('leads')
      .select('*, insurers(name, reputation_score), documents(*)')
      .eq('id', leadId)
      .single();

    return error ? { error } : { data };
  },

  /**
   * Actualizar estado de un lead
   */
  async updateLeadStatus(leadId, status, contactedBy = null) {
    const sb = getSupabase();
    const updates = { status };
    
    if (status === 'contactado' && contactedBy) {
      updates.first_contacted_at = new Date().toISOString();
      updates.contacted_by = contactedBy;
    }

    const { data, error } = await sb
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    return error ? { error } : { data };
  },

  /**
   * Aceptar lead y crear caso
   */
  async acceptLead(leadId, assignedUserId, feePercentage = 20) {
    const sb = getSupabase();

    // 1. Actualizar lead a "aceptado"
    const { data: lead, error: leadError } = await sb
      .from('leads')
      .update({ status: 'aceptado' })
      .eq('id', leadId)
      .select()
      .single();

    if (leadError) return { error: leadError };

    // 2. Crear caso
    const { data: newCase, error: caseError } = await sb
      .from('cases')
      .insert({
        tenant_id: lead.tenant_id,
        lead_id: leadId,
        assigned_user_id: assignedUserId,
        case_title: `${lead.full_name} c/ ${lead.insurer_name || 'NN'} s/ daños y perjuicios`,
        stage: 'reclamo_extrajudicial',
        fee_percentage: feePercentage,
      })
      .select()
      .single();

    return caseError ? { error: caseError } : { data: newCase };
  },

  /**
   * Obtener casos con pipeline
   */
  async getCases(tenantId, { stage, assignedUserId } = {}) {
    const sb = getSupabase();
    let query = sb
      .from('cases_full')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('stage', 'cerrado')
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);
    if (assignedUserId) query = query.eq('assigned_user_id', assignedUserId);

    const { data, error } = await query;
    return error ? { error } : { data };
  },

  /**
   * Actualizar etapa de un caso
   */
  async updateCaseStage(caseId, newStage) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('cases')
      .update({ stage: newStage })
      .eq('id', caseId)
      .select()
      .single();

    return error ? { error } : { data };
  },

  /**
   * Obtener notificaciones del usuario
   */
  async getNotifications(userId, unreadOnly = false) {
    const sb = getSupabase();
    let query = sb
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    return error ? { error } : { data };
  },

  /**
   * Marcar notificación como leída
   */
  async markNotificationRead(notificationId) {
    const sb = getSupabase();
    const { error } = await sb
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    return { error };
  },

  /**
   * Actualizar configuración del tenant
   */
  async updateTenantConfig(tenantId, section, data) {
    const sb = getSupabase();
    const updates = {};
    
    switch (section) {
      case 'formula': updates.formula_config = data; break;
      case 'scoring': updates.scoring_config = data; break;
      case 'textos': updates.landing_texts = data; break;
      case 'whatsapp': updates.wa_templates = data; break;
      case 'branding': 
        updates.brand_colors = data.brand_colors;
        updates.logo_url = data.logo_url;
        break;
      case 'datos':
        updates.name = data.name;
        updates.whatsapp = data.whatsapp;
        updates.address = data.address;
        updates.matricula = data.matricula;
        break;
    }

    const { error } = await sb
      .from('tenants')
      .update(updates)
      .eq('id', tenantId);

    return { error };
  },

  /**
   * Suscribirse a nuevos leads en tiempo real
   */
  subscribeToNewLeads(tenantId, callback) {
    const sb = getSupabase();
    return sb
      .channel('new-leads')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `tenant_id=eq.${tenantId}`,
      }, payload => {
        callback(payload.new);
      })
      .subscribe();
  },

  /**
   * Desuscribirse de realtime
   */
  unsubscribe(subscription) {
    const sb = getSupabase();
    sb.removeChannel(subscription);
  },
};

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

function mapAccidentType(tipo) {
  const map = {
    'Colisión vehicular': 'colision_vehicular',
    'Atropello de peatón': 'atropello_peaton',
    'Colisión con moto': 'colision_moto',
    'Vuelco': 'vuelco',
    'Choque en cadena': 'choque_cadena',
    'Siniestro en transporte público': 'transporte_publico',
  };
  return map[tipo] || 'otro';
}

function guessDocumentCategory(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('foto') || lower.includes('img') || lower.includes('image')) return 'foto_siniestro';
  if (lower.includes('acta') || lower.includes('policial') || lower.includes('denuncia')) return 'acta_policial';
  if (lower.includes('medic') || lower.includes('certific') || lower.includes('alta')) return 'certificado_medico';
  if (lower.includes('recibo') || lower.includes('sueldo') || lower.includes('salario')) return 'recibo_sueldo';
  if (lower.includes('poliza') || lower.includes('seguro')) return 'poliza_tercero';
  if (lower.includes('contrato')) return 'contrato';
  return 'otro';
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.JV_API = JV_API;
}
