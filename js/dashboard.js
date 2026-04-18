/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Dashboard Controller
   Conectado a Supabase — sin datos hardcodeados
   ══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ══════════════════════════════════════════
  // ESTADO GLOBAL
  // ══════════════════════════════════════════
  let currentUser   = null;
  let currentTenant = null;
  let leadsData     = [];
  let casesData     = [];
  let activeTab     = 'leads';
  let activeFilter  = 'todos';
  let realtimeSub   = null;

  const STAGES = {
    extrajudicial : 'Reclamo extrajudicial',
    mediacion     : 'Mediación',
    demanda       : 'Demanda',
    prueba        : 'Prueba',
    sentencia     : 'Sentencia / Ejecución',
  };
  const STAGE_KEYS = ['extrajudicial','mediacion','demanda','prueba','sentencia'];

  // Mapeo DB → clave de pipeline
  const STAGE_DB_MAP = {
    reclamo_extrajudicial : 'extrajudicial',
    mediacion             : 'mediacion',
    demanda               : 'demanda',
    prueba                : 'prueba',
    alegatos              : 'prueba',
    sentencia             : 'sentencia',
    ejecucion             : 'sentencia',
  };

  // ══════════════════════════════════════════
  // INIT — Auth guard + carga de datos
  // ══════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dash-nav-item').forEach(item => {
      item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
    initDashboard();
  });

  async function initDashboard() {
    showLoading(true);

    // 1. Verificar sesión activa
    const session = await JV_API.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    // 2. Cargar usuario y tenant
    currentUser = await JV_API.getCurrentUser();
    if (!currentUser) {
      // Auth OK pero sin registro en tabla users → redirigir
      await JV_API.logout();
      window.location.href = 'login.html';
      return;
    }
    currentTenant = currentUser.tenants;

    // 3. Actualizar header con datos reales
    document.getElementById('tenantName').textContent = currentTenant?.name || 'Mi estudio';
    document.getElementById('userName').textContent   = currentUser.full_name;
    const initials = currentUser.full_name
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;

    // 4. Cargar leads y casos en paralelo
    await Promise.all([loadLeads(), loadCases()]);

    showLoading(false);

    // 5. Renderizar tab inicial
    switchTab('leads');

    // 6. Suscribir a leads nuevos en tiempo real
    realtimeSub = JV_API.subscribeToNewLeads(currentUser.tenant_id, (newLead) => {
      leadsData.unshift(mapLead(newLead));
      updateNavBadge(leadsData.length);
      if (activeTab === 'leads') renderLeadsPanel();
    });
  }

  async function loadLeads() {
    const { data, error } = await JV_API.getLeads(currentUser.tenant_id, { limit: 100 });
    if (!error && data) leadsData = data.map(mapLead);
  }

  async function loadCases() {
    const { data, error } = await JV_API.getCases(currentUser.tenant_id);
    if (!error && data) casesData = data.map(mapCase);
  }

  // ══════════════════════════════════════════
  // MAPEOS — Supabase → formato del dashboard
  // ══════════════════════════════════════════
  function mapLead(l) {
    return {
      id          : l.id,
      name        : l.full_name,
      city        : l.city || '—',
      wa          : l.whatsapp,
      age         : l.age || null,
      income      : l.monthly_income || 0,
      score       : l.score_total || 0,
      level       : l.score_level || 'bajo',
      status      : l.status || 'nuevo',
      min         : l.estimated_min || 0,
      max         : l.estimated_max || 0,
      desc        : l.description || 'Sin descripción del caso.',
      ai          : l.ai_summary || null,
      risks       : l.ai_risks || [],
      docs        : 0,
      date        : timeAgo(l.created_at),
      injury      : l.had_surgery
                      ? 'Con cirugía'
                      : l.has_injuries ? 'Con lesiones' : 'Sin lesiones',
      insurer     : l.insurer_name || 'No identificada',
      policeReport: !!l.has_police_report,
      thirdParty  : !!l.has_third_party_data,
      sickDays    : l.sick_days || 0,
      type        : formatAccidentType(l.accident_type),
    };
  }

  function mapCase(c) {
    return {
      id      : c.id,
      name    : c.client_name || c.case_title || '—',
      stage   : STAGE_DB_MAP[c.stage] || 'extrajudicial',
      amount  : c.estimated_min || 0,
      date    : c.created_at
                  ? new Date(c.created_at).toLocaleDateString('es-AR')
                  : '—',
      insurer : c.insurer_name || 'No identificada',
    };
  }

  // ══════════════════════════════════════════
  // TAB SWITCHING
  // ══════════════════════════════════════════
  function switchTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.dash-nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.tab === tab)
    );
    document.querySelectorAll('.dash-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'panel-' + tab)
    );

    switch (tab) {
      case 'leads'   : renderLeadsPanel();    break;
      case 'pipeline': renderPipelinePanel(); break;
      case 'config'  : renderConfigPanel();   break;
    }
  }

  // ══════════════════════════════════════════
  // PANEL: LEADS
  // ══════════════════════════════════════════
  function renderLeadsPanel() {
    const panel    = document.getElementById('panel-leads');
    const filtered = activeFilter === 'todos'
      ? leadsData
      : leadsData.filter(l => l.level === activeFilter);

    const fmt        = JV_ENGINE.formatARS;
    const totalMin   = leadsData.reduce((a, l) => a + l.min, 0);
    const altos      = leadsData.filter(l => l.level === 'alto').length;
    const nuevos     = leadsData.filter(l => l.status === 'nuevo').length;
    const avgScore   = leadsData.length
      ? Math.round(leadsData.reduce((a, l) => a + l.score, 0) / leadsData.length)
      : 0;

    updateNavBadge(leadsData.length);

    panel.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total de leads</div>
          <div class="metric-value">${leadsData.length}</div>
          <div class="metric-delta">${nuevos} sin contactar</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Score promedio</div>
          <div class="metric-value">${avgScore}</div>
          <div class="metric-delta">sobre 100 puntos</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Leads prioritarios</div>
          <div class="metric-value">${altos}</div>
          <div class="metric-delta" style="color:var(--jv-success)">Score ≥ 75</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Monto potencial mín.</div>
          <div class="metric-value" style="font-size:20px">${fmt(totalMin)}</div>
          <div class="metric-delta">estimado acumulado</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Leads</div>
        <div class="filter-bar">
          <button class="filter-chip ${activeFilter==='todos'?'active':''}"
            onclick="JV_DASH.setFilter('todos')">Todos (${leadsData.length})</button>
          <button class="filter-chip ${activeFilter==='alto'?'active':''}"
            onclick="JV_DASH.setFilter('alto')">Alto (${leadsData.filter(l=>l.level==='alto').length})</button>
          <button class="filter-chip ${activeFilter==='medio'?'active':''}"
            onclick="JV_DASH.setFilter('medio')">Medio (${leadsData.filter(l=>l.level==='medio').length})</button>
          <button class="filter-chip ${activeFilter==='bajo'?'active':''}"
            onclick="JV_DASH.setFilter('bajo')">Bajo (${leadsData.filter(l=>l.level==='bajo').length})</button>
        </div>
      </div>

      ${filtered.length === 0 ? renderEmptyLeads() : `
        <div class="leads-table-wrap">
          <div class="leads-table-scroll">
            <table class="leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Score</th>
                  <th>Estado</th>
                  <th>Estimado</th>
                  <th>Descripción</th>
                  <th style="text-align:center">Docs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(l => `
                  <tr data-id="${l.id}" onclick="JV_DASH.showDetail(this.dataset.id)" style="cursor:pointer">
                    <td>
                      <div class="lead-cell-name">${esc(l.name)}</div>
                      <div class="lead-cell-city">${esc(l.city)} · ${l.date}</div>
                    </td>
                    <td><span class="badge badge-${l.level}">${l.score}/100</span></td>
                    <td><span class="badge badge-${l.status}">${l.status}</span></td>
                    <td>
                      <div class="lead-cell-amount">${fmt(l.min)}</div>
                      <div class="lead-cell-amount-max">a ${fmt(l.max)}</div>
                    </td>
                    <td><div class="lead-cell-summary">${esc(l.desc)}</div></td>
                    <td class="lead-cell-docs">${l.docs}</td>
                    <td>
                      <button class="btn-wa-sm"
                        onclick="event.stopPropagation(); window.open('https://wa.me/${waNumber(l.wa)}','_blank')">
                        WA
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
      <div id="leadDetailArea"></div>
    `;
  }

  function renderEmptyLeads() {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--jv-gray-400)">
        <div style="font-size:48px;margin-bottom:16px">📋</div>
        <div style="font-size:18px;font-weight:600;color:var(--jv-gray-600);margin-bottom:8px">
          Todavía no hay leads
        </div>
        <div style="font-size:14px">
          Cuando alguien complete el calculador en la landing, aparecerá acá automáticamente.
        </div>
      </div>
    `;
  }

  // ── Detalle de lead ──
  function showLeadDetail(id) {
    const l = leadsData.find(x => x.id === id);
    if (!l) return;

    const fmt  = JV_ENGINE.formatARS;
    const area = document.getElementById('leadDetailArea');

    area.innerHTML = `
      <div class="lead-detail">
        <div class="lead-detail-header">
          <div>
            <div class="lead-detail-name">${esc(l.name)}</div>
            <div class="lead-detail-meta">${esc(l.city)} · ${esc(l.type)} · ${l.date}</div>
          </div>
          <div class="lead-detail-actions">
            <span class="badge badge-${l.level}" style="font-size:13px;padding:6px 14px">
              ${l.score}/100 — ${l.level.toUpperCase()}
            </span>
            <button class="btn btn-outline btn-sm"
              onclick="document.getElementById('leadDetailArea').innerHTML=''">
              Cerrar
            </button>
          </div>
        </div>

        <div class="lead-fields-grid">
          <div class="lead-field">
            <div class="lead-field-label">Edad</div>
            <div class="lead-field-value">${l.age ? l.age + ' años' : '—'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Ingreso mensual</div>
            <div class="lead-field-value">${l.income ? fmt(l.income) : '—'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Lesión</div>
            <div class="lead-field-value">${esc(l.injury)}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Aseguradora</div>
            <div class="lead-field-value">${esc(l.insurer)}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Acta policial</div>
            <div class="lead-field-value">${l.policeReport ? '✓ Sí' : '✗ No'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Datos del tercero</div>
            <div class="lead-field-value">${l.thirdParty ? '✓ Sí' : '✗ No'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Días de baja</div>
            <div class="lead-field-value">${l.sickDays} días</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">WhatsApp</div>
            <div class="lead-field-value">${esc(l.wa)}</div>
          </div>
        </div>

        <div class="lead-description">
          <div class="lead-description-label">Descripción del caso</div>
          <div class="lead-description-text">${esc(l.desc)}</div>
        </div>

        ${l.ai ? `
          <div class="ai-analysis">
            <div class="ai-analysis-title">🤖 Análisis de IA</div>
            <div class="ai-analysis-text">${esc(l.ai)}</div>
            ${l.risks.length ? `
              <div class="ai-risks">
                ${l.risks.map(r => `<span class="ai-risk-tag">⚠ ${esc(r)}</span>`).join('')}
              </div>` : ''}
          </div>
        ` : ''}

        <div class="lead-estimate-box">
          <div class="lead-estimate-label">Indemnización estimada</div>
          <div class="lead-estimate-amount">${fmt(l.min)} — ${fmt(l.max)}</div>
        </div>

        <div class="lead-action-bar">
          <button class="btn btn-success btn-sm"
            data-id="${l.id}"
            onclick="JV_DASH.acceptLead(this.dataset.id, this)">
            ✓ Aceptar caso
          </button>
          <button class="btn btn-outline btn-sm" style="color:var(--jv-teal)"
            onclick="JV_DASH.contactLead('${l.id}')">
            ℹ Marcar como contactado
          </button>
          <button class="btn btn-danger-outline btn-sm"
            data-id="${l.id}"
            onclick="JV_DASH.rejectLead(this.dataset.id)">
            ✕ Rechazar
          </button>
          <button class="btn btn-whatsapp btn-sm"
            onclick="window.open('https://wa.me/${waNumber(l.wa)}','_blank')">
            WhatsApp
          </button>
        </div>
      </div>
    `;

    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ══════════════════════════════════════════
  // PANEL: PIPELINE
  // ══════════════════════════════════════════
  function renderPipelinePanel() {
    const panel  = document.getElementById('panel-pipeline');
    const fmt    = JV_ENGINE.formatARS;

    const grouped = {};
    STAGE_KEYS.forEach(s => grouped[s] = []);
    casesData.forEach(c => { if (grouped[c.stage]) grouped[c.stage].push(c); });

    const totalAmount = casesData.reduce((a, c) => a + c.amount, 0);
    const inDemanda   = casesData.filter(c => c.stage === 'demanda').length;

    panel.innerHTML = `
      <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="metric-card">
          <div class="metric-label">Casos activos</div>
          <div class="metric-value">${casesData.length}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">En demanda</div>
          <div class="metric-value">${inDemanda}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Honorarios potenciales (20%)</div>
          <div class="metric-value" style="font-size:20px">${fmt(totalAmount * 0.2)}</div>
        </div>
      </div>

      <div class="section-title mb-sm">Pipeline de litigios</div>

      ${casesData.length === 0 ? `
        <div style="text-align:center;padding:60px 20px;color:var(--jv-gray-400)">
          <div style="font-size:48px;margin-bottom:16px">⚖️</div>
          <div style="font-size:18px;font-weight:600;color:var(--jv-gray-600);margin-bottom:8px">
            No hay casos activos
          </div>
          <div style="font-size:14px">
            Aceptá un lead desde la pestaña Leads para crear el primer caso.
          </div>
        </div>
      ` : `
        <div class="kanban-board">
          ${STAGE_KEYS.map(s => `
            <div class="kanban-column">
              <div class="kanban-col-header">
                <div class="kanban-col-title">${STAGES[s]}</div>
                <div class="kanban-col-count">${grouped[s].length}</div>
              </div>
              ${grouped[s].map(c => `
                <div class="kanban-card">
                  <div class="kc-name">${esc(c.name)}</div>
                  <div class="kc-sub">${esc(c.insurer)}</div>
                  <div class="kc-footer">
                    <div class="kc-amount">${fmt(c.amount)}</div>
                    <div class="kc-date">${c.date}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `}
    `;
  }

  // ══════════════════════════════════════════
  // PANEL: CONFIG
  // ══════════════════════════════════════════
  function renderConfigPanel() {
    const panel = document.getElementById('panel-config');
    const cfg   = JV_CONFIG;

    const kwRows = cfg.keywords.slice(0, 15).map(kw => `
      <tr>
        <td>${esc(kw.palabra)}</td>
        <td><span class="kw-category kw-cat-${kw.categoria}">${kw.categoria}</span></td>
        <td style="font-weight:600;color:${kw.impacto>0?'var(--jv-success)':'var(--jv-danger)'}">
          ${kw.impacto > 0 ? '+' : ''}${kw.impacto}
        </td>
      </tr>
    `).join('');

    panel.innerHTML = `
      <div class="section-title mb-lg">Panel de configuración</div>

      <div class="config-card">
        <div class="config-title">Coeficientes de indemnización</div>
        <div class="config-row">
          <span class="config-label">Coeficiente Vuoto</span>
          <div><input class="config-input" type="number" value="${cfg.formula.coeficienteVuoto}" step="0.01"></div>
        </div>
        <div class="config-row">
          <span class="config-label">% Daño moral sobre patrimonial</span>
          <div><input class="config-input" type="number" value="${Math.round(cfg.formula.porcentajeDanoMoral*100)}" step="1"><span class="config-suffix">%</span></div>
        </div>
        <div class="config-row">
          <span class="config-label">Factor mínimo (rango)</span>
          <div><input class="config-input" type="number" value="${cfg.formula.factorMinimo}" step="0.05"></div>
        </div>
        <div class="config-row">
          <span class="config-label">Factor máximo (rango)</span>
          <div><input class="config-input" type="number" value="${cfg.formula.factorMaximo}" step="0.05"></div>
        </div>
        <div class="config-row">
          <span class="config-label">Gastos médicos — con cirugía</span>
          <div><input class="config-input" type="number" value="${cfg.formula.gastosMedicosCirugia}" step="10000"><span class="config-suffix">ARS</span></div>
        </div>
        <div class="config-row">
          <span class="config-label">Gastos médicos — lesión leve</span>
          <div><input class="config-input" type="number" value="${cfg.formula.gastosMedicosLeve}" step="10000"><span class="config-suffix">ARS</span></div>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar cambios</button>
          <button class="btn btn-outline btn-sm">Restaurar valores</button>
        </div>
      </div>

      <div class="config-card">
        <div class="config-title">Diccionario NLP de keywords</div>
        <table class="kw-table">
          <thead><tr><th>Keyword</th><th>Categoría</th><th>Impacto</th></tr></thead>
          <tbody>${kwRows}</tbody>
        </table>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-outline btn-sm">+ Agregar keyword</button>
          <button class="btn btn-outline btn-sm" style="color:var(--jv-gray-400)">Restaurar predeterminados</button>
        </div>
      </div>

      <div class="config-card">
        <div class="config-title">Mensajes de WhatsApp</div>
        <div class="wa-template">
          <div class="wa-template-label">Mensaje de bienvenida al lead</div>
          <textarea>${esc(cfg.mensajes.bienvenida)}</textarea>
        </div>
        <div class="wa-template">
          <div class="wa-template-label">Mensaje de seguimiento</div>
          <textarea>${esc(cfg.mensajes.seguimiento)}</textarea>
        </div>
        <div class="wa-vars">
          Variables: <code>{nombre}</code> <code>{monto_min}</code> <code>{monto_max}</code> <code>{ciudad}</code>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar mensajes</button>
        </div>
      </div>

      <div class="config-card">
        <div class="config-title">Datos del estudio</div>
        <div class="landing-field">
          <div class="landing-field-label">Nombre del estudio</div>
          <input type="text" value="${esc(currentTenant?.name || '')}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">WhatsApp</div>
          <input type="text" value="${esc(currentTenant?.whatsapp || '')}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">Email</div>
          <input type="text" value="${esc(currentTenant?.email || '')}">
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar datos</button>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  // ACCIONES SOBRE LEADS
  // ══════════════════════════════════════════
  async function acceptLead(id, btn) {
    if (!confirm('¿Aceptar este caso y crear el expediente?')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }

    const { data, error } = await JV_API.acceptLead(id, currentUser.id);

    if (error) {
      alert('Error al aceptar el caso: ' + (error.message || JSON.stringify(error)));
      if (btn) { btn.disabled = false; btn.textContent = '✓ Aceptar caso'; }
      return;
    }

    await Promise.all([loadLeads(), loadCases()]);
    renderLeadsPanel();
    alert('✅ Caso creado: ' + (data.case_title || 'expediente generado'));
  }

  async function contactLead(id) {
    const { error } = await JV_API.updateLeadStatus(id, 'contactado', currentUser.id);
    if (!error) {
      await loadLeads();
      renderLeadsPanel();
    }
  }

  async function rejectLead(id) {
    if (!confirm('¿Rechazar este lead?')) return;
    const { error } = await JV_API.updateLeadStatus(id, 'rechazado');
    if (!error) {
      await loadLeads();
      renderLeadsPanel();
    }
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════
  function showLoading(visible) {
    let overlay = document.getElementById('dashLoadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dashLoadingOverlay';
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(255,255,255,0.85);
        display:flex;align-items:center;justify-content:center;
        z-index:9999;font-size:16px;color:var(--jv-gray-500);
        flex-direction:column;gap:12px;
      `;
      overlay.innerHTML = `
        <div style="width:40px;height:40px;border:3px solid var(--jv-gray-200);
          border-top-color:var(--jv-teal);border-radius:50%;
          animation:spin 0.8s linear infinite"></div>
        <div>Cargando dashboard...</div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = visible ? 'flex' : 'none';
  }

  function updateNavBadge(count) {
    const badge = document.querySelector('.dash-nav-item[data-tab="leads"] .nav-badge');
    if (badge) badge.textContent = count;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  function waNumber(wa) {
    return (wa || '').replace(/[^0-9]/g, '');
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAccidentType(t) {
    const map = {
      colision_vehicular : 'Colisión vehicular',
      atropello_peaton   : 'Atropello de peatón',
      colision_moto      : 'Colisión con moto',
      vuelco             : 'Vuelco',
      choque_cadena      : 'Choque en cadena',
      transporte_publico : 'Transporte público',
      otro               : 'Otro',
    };
    return map[t] || t || 'No especificado';
  }

  // ══════════════════════════════════════════
  // API PÚBLICA (handlers de onclick en HTML)
  // ══════════════════════════════════════════
  window.JV_DASH = {
    setFilter(f)       { activeFilter = f; renderLeadsPanel(); },
    showDetail(id)     { showLeadDetail(id); },
    acceptLead(id, btn){ acceptLead(id, btn); },
    contactLead(id)    { contactLead(id); },
    rejectLead(id)     { rejectLead(id); },
    async logout() {
      if (realtimeSub) JV_API.unsubscribe(realtimeSub);
      await JV_API.logout();
      window.location.href = 'login.html';
    },
  };

})();
