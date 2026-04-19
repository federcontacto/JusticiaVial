/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Dashboard Pro Controller
   ══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ══════════════════════════════════════════
  // ESTADO
  // ══════════════════════════════════════════
  let currentUser   = null;
  let currentTenant = null;
  let leadsData     = [];
  let casesData     = [];
  let keywordsData  = [];
  let usersData     = [];
  let searchQuery   = '';
  let activeTab     = 'leads';
  let activeFilter  = 'todos';
  let realtimeSub   = null;
  let sortField     = 'rawDate';
  let sortDir       = 'desc';

  const PAGE_TITLES = {
    leads    : 'Leads',
    pipeline : 'Pipeline de litigios',
    analytics: 'Analíticas',
    config   : 'Configuración',
  };

  const STAGES = {
    extrajudicial: 'Reclamo extrajudicial',
    mediacion    : 'Mediación',
    demanda      : 'Demanda',
    prueba       : 'Prueba',
    sentencia    : 'Sentencia / Ejecución',
  };
  const STAGE_KEYS = ['extrajudicial','mediacion','demanda','prueba','sentencia'];
  const STAGE_DB_MAP = {
    reclamo_extrajudicial: 'extrajudicial',
    mediacion            : 'mediacion',
    demanda              : 'demanda',
    prueba               : 'prueba',
    alegatos             : 'prueba',
    sentencia            : 'sentencia',
    ejecucion            : 'sentencia',
  };

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dash-nav-item').forEach(item => {
      item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
    initDashboard();
  });

  async function initDashboard() {
    showLoading(true);

    const session = await JV_API.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    currentUser = await JV_API.getCurrentUser();
    if (!currentUser) { await JV_API.logout(); window.location.href = 'login.html'; return; }
    currentTenant = currentUser.tenants;

    // Header
    document.getElementById('tenantName').textContent = currentTenant?.name || 'Mi estudio';
    document.getElementById('userName').textContent   = currentUser.full_name;
    document.getElementById('userRole').textContent   = currentUser.role;
    const initials = currentUser.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;

    await Promise.all([loadLeads(), loadCases()]);

    applyRoleAccess();
    initTopbarDate();
    showLoading(false);
    switchTab('leads');

    // ESC cierra el slide-over
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSlideOver(); });

    realtimeSub = JV_API.subscribeToNewLeads(currentUser.tenant_id, lead => {
      leadsData.unshift(mapLead(lead));
      updateLeadsBadge();
      if (activeTab === 'leads') renderLeadsPanel();
    });
  }

  async function loadLeads() {
    const { data, error } = await JV_API.getLeads(currentUser.tenant_id, { limit: 200 });
    if (!error && data) leadsData = data.map(mapLead);
  }

  async function loadCases() {
    const { data, error } = await JV_API.getCases(currentUser.tenant_id);
    if (!error && data) casesData = data.map(mapCase);
  }

  async function loadKeywords() {
    const { data, error } = await JV_API.getKeywords(currentUser.tenant_id);
    if (!error && data) keywordsData = data;
    return keywordsData;
  }

  async function loadUsers() {
    const { data, error } = await JV_API.getUsers(currentUser.tenant_id);
    if (!error && data) usersData = data;
    return usersData;
  }

  // ══════════════════════════════════════════
  // TOAST SYSTEM
  // ══════════════════════════════════════════
  function showToast(msg, type = 'success', duration = 3500) {
    let container = document.getElementById('jv-toasts');
    if (!container) {
      container = document.createElement('div');
      container.id = 'jv-toasts';
      document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `jv-toast jv-toast-${type}`;
    el.innerHTML = `<span class="jv-toast-icon">${icons[type] || '•'}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('jv-toast-out');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }

  // ══════════════════════════════════════════
  // SLIDE-OVER PANEL
  // ══════════════════════════════════════════
  function openSlideOver(html) {
    closeSlideOver();

    const backdrop = document.createElement('div');
    backdrop.id = 'jv-backdrop';
    backdrop.className = 'slide-backdrop';
    backdrop.addEventListener('click', closeSlideOver);

    const panel = document.createElement('div');
    panel.id = 'jv-slideover';
    panel.className = 'slide-panel';
    panel.innerHTML = html;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    document.body.style.overflow = 'hidden';
  }

  function closeSlideOver() {
    document.getElementById('jv-backdrop')?.remove();
    document.getElementById('jv-slideover')?.remove();
    document.body.style.overflow = '';
  }

  // ══════════════════════════════════════════
  // TOPBAR DATE
  // ══════════════════════════════════════════
  function initTopbarDate() {
    const el = document.getElementById('topbarDate');
    if (!el) return;
    const update = () => {
      const now = new Date();
      el.textContent = now.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
    };
    update();
    setInterval(update, 60000);
  }

  // ══════════════════════════════════════════
  // MAPEOS
  // ══════════════════════════════════════════
  function mapLead(l) {
    return {
      id          : l.id,
      name        : l.full_name,
      city        : l.city || '—',
      wa          : l.whatsapp,
      age         : l.age,
      income      : l.monthly_income || 0,
      score       : l.score_total || 0,
      level       : l.score_level || 'bajo',
      status      : l.status || 'nuevo',
      min         : l.estimated_min || 0,
      max         : l.estimated_max || 0,
      desc        : l.description || 'Sin descripción.',
      ai          : l.ai_summary || null,
      risks       : l.ai_risks || [],
      docs        : 0,
      date        : timeAgo(l.created_at),
      rawDate     : l.created_at,
      injury      : l.had_surgery ? 'Con cirugía' : l.has_injuries ? 'Con lesiones' : 'Sin lesiones',
      insurer     : l.insurer_name || 'No identificada',
      policeReport: !!l.has_police_report,
      thirdParty  : !!l.has_third_party_data,
      sickDays    : l.sick_days || 0,
      type        : fmtAccidentType(l.accident_type),
    };
  }

  function mapCase(c) {
    return {
      id     : c.id,
      name   : c.client_name || c.case_title || '—',
      stage  : STAGE_DB_MAP[c.stage] || 'extrajudicial',
      amount : c.estimated_min || 0,
      date   : c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—',
      insurer: c.insurer_name || 'No identificada',
    };
  }

  // ══════════════════════════════════════════
  // CONTROL DE ACCESO POR ROL
  // ══════════════════════════════════════════
  function canAccessTab(tab) {
    const role = currentUser?.role;
    if (!role || role === 'admin') return true;
    if (role === 'abogado')   return ['leads', 'pipeline', 'analytics'].includes(tab);
    if (role === 'secretaria') return tab === 'leads';
    return tab === 'leads';
  }

  function applyRoleAccess() {
    document.querySelectorAll('.dash-nav-item[data-tab]').forEach(item => {
      item.style.display = canAccessTab(item.dataset.tab) ? '' : 'none';
    });
  }

  // ══════════════════════════════════════════
  // TAB SWITCHING
  // ══════════════════════════════════════════
  function switchTab(tab) {
    // Redirigir a leads si el rol no tiene acceso
    if (!canAccessTab(tab)) { switchTab('leads'); return; }
    activeTab = tab;
    document.querySelectorAll('.dash-nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.tab === tab));
    document.querySelectorAll('.dash-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'panel-' + tab));
    document.getElementById('pageTitle').textContent = PAGE_TITLES[tab] || tab;

    // Reset search on tab change
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    searchQuery = '';

    // Show search only on leads
    const sw = document.querySelector('.dash-search-wrap');
    if (sw) sw.style.display = tab === 'leads' ? '' : 'none';

    switch (tab) {
      case 'leads'    : renderLeadsPanel();    break;
      case 'pipeline' : renderPipelinePanel(); break;
      case 'analytics': renderAnalyticsPanel(); break;
      case 'config'   : renderConfigPanel();   break;
    }
  }

  // ══════════════════════════════════════════
  // PANEL: LEADS
  // ══════════════════════════════════════════
  function sortLeads(field) {
    if (sortField === field) {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      sortField = field;
      sortDir   = 'desc';
    }
    renderLeadsPanel();
  }

  function sortIcon(field) {
    if (sortField !== field) return '<span class="sort-idle">⇅</span>';
    return sortDir === 'desc' ? '<span class="sort-active-icon">↓</span>' : '<span class="sort-active-icon">↑</span>';
  }

  function getFilteredLeads() {
    let list = [...leadsData];
    if (activeFilter !== 'todos') list = list.filter(l => l.level === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        (l.insurer && l.insurer.toLowerCase().includes(q)) ||
        (l.desc && l.desc.toLowerCase().includes(q))
      );
    }
    // Sort
    list.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'name'  : av = a.name;    bv = b.name;    break;
        case 'score' : av = a.score;   bv = b.score;   break;
        case 'amount': av = a.max;     bv = b.max;     break;
        default      : av = a.rawDate; bv = b.rawDate; break;
      }
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }

  function renderLeadsPanel() {
    const panel    = document.getElementById('panel-leads');
    const filtered = getFilteredLeads();
    const fmt      = JV_ENGINE.formatARS;

    const altos    = leadsData.filter(l => l.level === 'alto').length;
    const nuevos   = leadsData.filter(l => l.status === 'nuevo').length;
    const avgScore = leadsData.length
      ? Math.round(leadsData.reduce((a, l) => a + l.score, 0) / leadsData.length) : 0;
    const totalMin = leadsData.reduce((a, l) => a + l.min, 0);

    updateLeadsBadge();

    panel.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-icon">📋</span>
          <div class="metric-label">Total de leads</div>
          <div class="metric-value">${leadsData.length}</div>
          <div class="metric-delta">${nuevos} sin contactar</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">⭐</span>
          <div class="metric-label">Score promedio</div>
          <div class="metric-value">${avgScore}</div>
          <div class="metric-delta">sobre 100 puntos</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🔴</span>
          <div class="metric-label">Leads prioritarios</div>
          <div class="metric-value">${altos}</div>
          <div class="metric-delta metric-up">Score ≥ 75</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">💰</span>
          <div class="metric-label">Monto potencial mín.</div>
          <div class="metric-value" style="font-size:22px">${fmt(totalMin)}</div>
          <div class="metric-delta">estimado acumulado</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">
          Leads
          ${searchQuery ? `<span class="section-title-sub">"${esc(searchQuery)}" · ${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
        <div class="filter-bar">
          <button class="filter-chip ${activeFilter==='todos' ?'active':''}" onclick="JV_DASH.setFilter('todos')">Todos (${leadsData.length})</button>
          <button class="filter-chip ${activeFilter==='alto'  ?'active':''}" onclick="JV_DASH.setFilter('alto')">🔴 Alto (${leadsData.filter(l=>l.level==='alto').length})</button>
          <button class="filter-chip ${activeFilter==='medio' ?'active':''}" onclick="JV_DASH.setFilter('medio')">🟡 Medio (${leadsData.filter(l=>l.level==='medio').length})</button>
          <button class="filter-chip ${activeFilter==='bajo'  ?'active':''}" onclick="JV_DASH.setFilter('bajo')">⚪ Bajo (${leadsData.filter(l=>l.level==='bajo').length})</button>
          <button class="btn-refresh" onclick="JV_DASH.refreshLeads()" title="Actualizar leads">↻</button>
        </div>
      </div>

      ${filtered.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">${searchQuery ? 'Sin resultados' : 'No hay leads todavía'}</div>
            <div class="empty-state-desc">${searchQuery
              ? 'Probá con otro nombre o ciudad.'
              : 'Cuando alguien use el calculador en la landing, aparecerá acá automáticamente.'}</div>
          </div>`
        : `<div class="leads-table-wrap">
            <div class="leads-table-scroll">
              <table class="leads-table">
                <thead>
                  <tr>
                    <th class="th-sort ${sortField==='name'?'th-sort-on':''}" onclick="JV_DASH.sortLeads('name')">
                      Lead ${sortIcon('name')}
                    </th>
                    <th class="th-sort ${sortField==='score'?'th-sort-on':''}" onclick="JV_DASH.sortLeads('score')">
                      Score ${sortIcon('score')}
                    </th>
                    <th>Estado</th>
                    <th class="th-sort ${sortField==='amount'?'th-sort-on':''}" onclick="JV_DASH.sortLeads('amount')">
                      Estimado ${sortIcon('amount')}
                    </th>
                    <th>Descripción</th>
                    <th class="th-sort ${sortField==='rawDate'?'th-sort-on':''}" onclick="JV_DASH.sortLeads('rawDate')">
                      Fecha ${sortIcon('rawDate')}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(l => `
                    <tr data-id="${l.id}" onclick="JV_DASH.showDetail(this.dataset.id)">
                      <td>
                        <div class="lead-cell-name">${esc(l.name)}</div>
                        <div class="lead-cell-city">${esc(l.city)} · ${esc(l.type)}</div>
                      </td>
                      <td>
                        <span class="badge badge-${l.level}">${l.score}/100</span>
                      </td>
                      <td>
                        <span class="badge badge-${l.status} badge-clickable"
                          data-id="${l.id}"
                          onclick="event.stopPropagation();JV_DASH.quickStatus(this, '${l.id}')">
                          ${l.status} ▾
                        </span>
                      </td>
                      <td>
                        <div class="lead-cell-amount">${fmt(l.min)}</div>
                        <div class="lead-cell-amount-max">a ${fmt(l.max)}</div>
                      </td>
                      <td><div class="lead-cell-summary">${esc(l.desc)}</div></td>
                      <td class="lead-cell-date">${l.date}</td>
                      <td>
                        <button class="btn-wa-sm" onclick="event.stopPropagation();window.open('https://wa.me/${waNum(l.wa)}','_blank')">
                          💬
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`
      }
    `;
  }

  function showLeadDetail(id) {
    const l = leadsData.find(x => x.id === id);
    if (!l) return;
    const fmt = JV_ENGINE.formatARS;

    openSlideOver(`
      <div class="slide-header">
        <div class="slide-header-info">
          <div class="slide-lead-name">${esc(l.name)}</div>
          <div class="slide-lead-meta">${esc(l.city)} · ${esc(l.type)} · ${l.date}</div>
        </div>
        <button class="slide-close-btn" onclick="JV_DASH.closeDetail()">✕</button>
      </div>

      <div class="slide-body">
        <div class="slide-score-row">
          <span class="badge badge-${l.level}" style="font-size:13px;padding:6px 16px">
            ${l.score}/100 · ${l.level.toUpperCase()}
          </span>
          <span class="slide-insurer-tag">🏢 ${esc(l.insurer)}</span>
        </div>

        <div class="lead-fields-grid" style="margin-bottom:14px">
          ${field('Edad',          l.age ? l.age + ' años' : '—')}
          ${field('Ingreso',       l.income ? fmt(l.income) + '/mes' : '—')}
          ${field('Lesión',        l.injury)}
          ${field('Aseguradora',   l.insurer)}
          ${field('Acta policial', l.policeReport ? '✓ Sí' : '✗ No')}
          ${field('Datos tercero', l.thirdParty   ? '✓ Sí' : '✗ No')}
          ${field('Días de baja',  l.sickDays + ' días')}
          ${field('WhatsApp',      l.wa || '—')}
        </div>

        <div class="lead-description" style="margin-bottom:14px">
          <div class="lead-description-label">Descripción del caso</div>
          <div class="lead-description-text">${esc(l.desc)}</div>
        </div>

        ${l.ai ? `
          <div class="ai-analysis" style="margin-bottom:14px">
            <div class="ai-analysis-title">🤖 Análisis IA</div>
            <div class="ai-analysis-text">${esc(l.ai)}</div>
            ${l.risks.length ? `<div class="ai-risks">${l.risks.map(r=>`<span class="ai-risk-tag">⚠ ${esc(r)}</span>`).join('')}</div>` : ''}
          </div>` : ''}

        <div class="lead-estimate-box" style="margin-bottom:16px">
          <div class="lead-estimate-label">Indemnización estimada</div>
          <div class="lead-estimate-amount">${fmt(l.min)} — ${fmt(l.max)}</div>
        </div>

        <div class="slide-actions">
          <button class="btn btn-success btn-sm" data-id="${l.id}"
            onclick="JV_DASH.acceptLead(this.dataset.id, this)">✓ Aceptar caso</button>
          <button class="btn btn-outline btn-sm" style="color:#2E86AB"
            data-id="${l.id}" onclick="JV_DASH.contactLead(this.dataset.id)">✉ Contactado</button>
          <button class="btn btn-danger-outline btn-sm" data-id="${l.id}"
            onclick="JV_DASH.rejectLead(this.dataset.id)">✕ Rechazar</button>
          <button class="btn btn-whatsapp btn-sm"
            onclick="window.open('https://wa.me/${waNum(l.wa)}','_blank')">💬 WhatsApp</button>
        </div>
      </div>
    `);
  }

  function field(label, value) {
    return `<div class="lead-field">
      <div class="lead-field-label">${label}</div>
      <div class="lead-field-value">${esc(String(value))}</div>
    </div>`;
  }

  // ══════════════════════════════════════════
  // PANEL: PIPELINE
  // ══════════════════════════════════════════
  function renderPipelinePanel() {
    const panel = document.getElementById('panel-pipeline');
    const fmt   = JV_ENGINE.formatARS;

    const grouped = {};
    STAGE_KEYS.forEach(s => grouped[s] = []);
    casesData.forEach(c => { if (grouped[c.stage]) grouped[c.stage].push(c); });

    const totalAmount = casesData.reduce((a, c) => a + c.amount, 0);
    const inDemanda   = casesData.filter(c => c.stage === 'demanda').length;
    const honPot      = totalAmount * 0.20;

    panel.innerHTML = `
      <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric-card">
          <span class="metric-icon">⚖️</span>
          <div class="metric-label">Casos activos</div>
          <div class="metric-value">${casesData.length}</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">⚡</span>
          <div class="metric-label">En demanda</div>
          <div class="metric-value">${inDemanda}</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">💼</span>
          <div class="metric-label">Honorarios potenciales (20%)</div>
          <div class="metric-value" style="font-size:20px">${fmt(honPot)}</div>
        </div>
      </div>

      ${casesData.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">⚖️</div>
            <div class="empty-state-title">No hay casos activos</div>
            <div class="empty-state-desc">Aceptá un lead desde la pestaña Leads para crear el primer caso.</div>
          </div>`
        : `<div class="section-title mb-md">Pipeline de litigios</div>
           <div class="kanban-scroll-wrap">
             <div class="kanban-board">
               ${STAGE_KEYS.map(s => {
                 const colTotal = grouped[s].reduce((a, c) => a + c.amount, 0);
                 const nextStage = STAGE_KEYS[STAGE_KEYS.indexOf(s) + 1] || null;
                 return `
                 <div class="kanban-column">
                   <div class="kanban-col-header">
                     <div>
                       <div class="kanban-col-title">${STAGES[s]}</div>
                       ${colTotal > 0 ? `<div class="kanban-col-total">${fmt(colTotal)}</div>` : ''}
                     </div>
                     <div class="kanban-col-count">${grouped[s].length}</div>
                   </div>
                   ${grouped[s].length === 0
                     ? `<div class="kanban-empty">Sin casos</div>`
                     : grouped[s].map(c => `
                       <div class="kanban-card">
                         <div class="kc-name">${esc(c.name)}</div>
                         <div class="kc-sub">${esc(c.insurer)}</div>
                         <div class="kc-footer">
                           <div class="kc-amount">${fmt(c.amount)}</div>
                           <div class="kc-date">${c.date}</div>
                         </div>
                         ${nextStage ? `
                           <button class="kc-move-btn" data-id="${c.id}" data-stage="${nextStage}"
                             onclick="JV_DASH.moveCase(this.dataset.id, this.dataset.stage)">
                             → ${STAGES[nextStage].split(' ')[0]}
                           </button>` : `
                           <div class="kc-final-tag">✓ Finalizado</div>`}
                       </div>
                     `).join('')}
                 </div>`;
               }).join('')}
             </div>
           </div>`
      }
    `;
  }

  // ══════════════════════════════════════════
  // PANEL: ANALYTICS
  // ══════════════════════════════════════════
  function renderAnalyticsPanel() {
    const panel = document.getElementById('panel-analytics');
    const fmt   = JV_ENGINE.formatARS;

    const total     = leadsData.length;
    const altos     = leadsData.filter(l => l.level === 'alto').length;
    const medios    = leadsData.filter(l => l.level === 'medio').length;
    const bajos     = leadsData.filter(l => l.level === 'bajo').length;
    const aceptados = leadsData.filter(l => l.status === 'aceptado').length;
    const contactados = leadsData.filter(l => ['contactado','evaluacion','aceptado'].includes(l.status)).length;
    const convRate  = total ? Math.round(aceptados / total * 100) : 0;
    const contRate  = total ? Math.round(contactados / total * 100) : 0;
    const totalMin  = leadsData.reduce((a, l) => a + l.min, 0);
    const avgScore  = total ? Math.round(leadsData.reduce((a, l) => a + l.score, 0) / total) : 0;

    // By month (last 6)
    const monthBuckets = buildMonthlyBuckets();
    const maxMonth     = Math.max(...monthBuckets.map(m => m.count), 1);
    const barChartHtml = monthBuckets.map(m => {
      const pct = Math.round((m.count / maxMonth) * 96) + 4;
      return `
        <div class="bar-group">
          ${m.count > 0 ? `<div class="bar-value">${m.count}</div>` : '<div class="bar-value" style="opacity:0">0</div>'}
          <div class="bar-fill" style="height:${pct}%"></div>
          <div class="bar-label">${m.label}</div>
        </div>
      `;
    }).join('');

    // By insurer
    const insurerMap = {};
    leadsData.forEach(l => {
      const k = l.insurer || 'No identificada';
      insurerMap[k] = (insurerMap[k] || 0) + 1;
    });
    const topInsurers = Object.entries(insurerMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    const maxIns = topInsurers[0]?.[1] || 1;

    panel.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-icon">📋</span>
          <div class="metric-label">Total leads</div>
          <div class="metric-value">${total}</div>
          <div class="metric-delta">${aceptados} aceptados</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">📈</span>
          <div class="metric-label">Score promedio</div>
          <div class="metric-value">${avgScore}</div>
          <div class="metric-delta">sobre 100</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">✅</span>
          <div class="metric-label">Tasa de conversión</div>
          <div class="metric-value">${convRate}%</div>
          <div class="metric-delta metric-up">${aceptados} casos creados</div>
        </div>
        <div class="metric-card">
          <span class="metric-icon">💰</span>
          <div class="metric-label">Cartera potencial mín.</div>
          <div class="metric-value" style="font-size:20px">${fmt(totalMin)}</div>
          <div class="metric-delta">leads activos</div>
        </div>
      </div>

      <div class="analytics-grid">

        <!-- Leads por mes -->
        <div class="analytics-card">
          <div class="analytics-title">Leads por mes (últimos 6 meses)</div>
          ${total === 0
            ? '<div style="color:#94A3B8;font-size:13px;text-align:center;padding:30px 0">Sin datos aún</div>'
            : `<div class="bar-chart">${barChartHtml}</div>`}
        </div>

        <!-- Distribución por score -->
        <div class="analytics-card">
          <div class="analytics-title">Distribución por calidad</div>
          <div class="score-dist">
            <div class="score-row">
              <div class="score-row-label">🔴 Alto (≥75)</div>
              <div class="score-bar-wrap">
                <div class="score-bar-fill score-bar-alto" style="width:${total?Math.round(altos/total*100):0}%"></div>
              </div>
              <div class="score-row-count">${altos}</div>
            </div>
            <div class="score-row">
              <div class="score-row-label">🟡 Medio (40-74)</div>
              <div class="score-bar-wrap">
                <div class="score-bar-fill score-bar-medio" style="width:${total?Math.round(medios/total*100):0}%"></div>
              </div>
              <div class="score-row-count">${medios}</div>
            </div>
            <div class="score-row">
              <div class="score-row-label">⚪ Bajo (&lt;40)</div>
              <div class="score-bar-wrap">
                <div class="score-bar-fill score-bar-bajo" style="width:${total?Math.round(bajos/total*100):0}%"></div>
              </div>
              <div class="score-row-count">${bajos}</div>
            </div>
          </div>
        </div>

        <!-- Conversión -->
        <div class="analytics-card">
          <div class="analytics-title">Embudo de conversión</div>
          <div class="conv-stats">
            <div class="conv-stat">
              <div class="conv-stat-value">${total}</div>
              <div class="conv-stat-label">Leads totales</div>
            </div>
            <div class="conv-stat">
              <div class="conv-stat-value" style="color:#2E86AB">${contRate}%</div>
              <div class="conv-stat-label">Contactados</div>
            </div>
            <div class="conv-stat">
              <div class="conv-stat-value" style="color:#27AE60">${convRate}%</div>
              <div class="conv-stat-label">Convertidos</div>
            </div>
          </div>
        </div>

        <!-- Top aseguradoras -->
        <div class="analytics-card">
          <div class="analytics-title">Top aseguradoras en leads</div>
          ${topInsurers.length === 0
            ? '<div style="color:#94A3B8;font-size:13px;text-align:center;padding:20px 0">Sin datos</div>'
            : `<div class="mini-list">
                ${topInsurers.map(([name, count], i) => `
                  <div class="mini-list-row">
                    <div class="mini-list-rank">${i+1}</div>
                    <div class="mini-list-label">${esc(name)}</div>
                    <div class="mini-list-bar-wrap">
                      <div class="mini-list-bar-fill" style="width:${Math.round(count/maxIns*100)}%"></div>
                    </div>
                    <div class="mini-list-count">${count}</div>
                  </div>
                `).join('')}
              </div>`}
        </div>

      </div>
    `;
  }

  function buildMonthlyBuckets() {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: d.toLocaleDateString('es-AR', { month: 'short' }),
        year : d.getFullYear(),
        month: d.getMonth(),
        count: 0,
      });
    }
    leadsData.forEach(l => {
      if (!l.rawDate) return;
      const d = new Date(l.rawDate);
      const b = buckets.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (b) b.count++;
    });
    return buckets;
  }

  // ══════════════════════════════════════════
  // PANEL: CONFIG
  // ══════════════════════════════════════════
  async function renderConfigPanel() {
    const panel = document.getElementById('panel-config');

    // Sección restringida a admins
    if (!canAccessTab('config')) {
      panel.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔒</div>
          <div class="empty-state-title">Acceso restringido</div>
          <div class="empty-state-desc">La configuración es solo para administradores del estudio.</div>
        </div>`;
      return;
    }

    panel.innerHTML = `<div style="color:#94A3B8;padding:20px 0">Cargando configuración...</div>`;

    await Promise.all([
      loadKeywords(),
      loadUsers(),
    ]);

    const t   = currentTenant || {};
    const fc  = t.formula_config  || JV_CONFIG.formula;
    const sc  = t.scoring_config  || {};
    const lt  = t.landing_texts   || {};
    const wa  = t.wa_templates    || {};

    panel.innerHTML = `<div class="config-sections">

      ${accordion('studio', '🏢', 'Datos del estudio', 'Nombre, WhatsApp, dirección y matrícula', `
        <div class="config-row-2">
          <div class="config-field">
            <label class="config-field-label">Nombre del estudio</label>
            <input id="cf-nombre" type="text" value="${esc(t.name||'')}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Email de contacto</label>
            <input id="cf-email" type="email" value="${esc(t.email||'')}">
          </div>
        </div>
        <div class="config-row-2">
          <div class="config-field">
            <label class="config-field-label">WhatsApp (solo números, con código país)</label>
            <input id="cf-wa" type="text" value="${esc(t.whatsapp||'')}" placeholder="5491112345678">
          </div>
          <div class="config-field">
            <label class="config-field-label">Teléfono</label>
            <input id="cf-tel" type="text" value="${esc(t.phone||'')}">
          </div>
        </div>
        <div class="config-row-2">
          <div class="config-field">
            <label class="config-field-label">Dirección</label>
            <input id="cf-dir" type="text" value="${esc(t.address||'')}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Ciudad</label>
            <input id="cf-ciudad" type="text" value="${esc(t.city||'')}">
          </div>
        </div>
        <div class="config-row-2">
          <div class="config-field">
            <label class="config-field-label">Jurisdicción</label>
            <input id="cf-jur" type="text" value="${esc(t.jurisdiction||'CABA')}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Matrícula profesional</label>
            <input id="cf-mat" type="text" value="${esc(t.matricula||'')}">
          </div>
        </div>
        <div class="config-save-bar">
          <button class="btn btn-teal btn-sm" onclick="JV_DASH.saveStudio()">Guardar datos</button>
          <span class="config-save-msg" id="msg-studio">✓ Guardado</span>
        </div>
      `)}

      ${accordion('users', '👥', 'Usuarios y permisos', 'Alta, baja y modificación de usuarios del estudio', renderUsersBody())}

      ${accordion('formula', '⚖️', 'Fórmula Vuoto', 'Coeficientes de cálculo de indemnizaciones', `
        <div class="config-section-label">Coeficientes principales</div>
        <div class="config-row-3">
          <div class="config-field">
            <label class="config-field-label">Coeficiente Vuoto</label>
            <input id="cf-vuoto" type="number" step="0.01" value="${fc.coeficienteVuoto||1.65}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Edad de jubilación</label>
            <input id="cf-jubilacion" type="number" step="1" value="${fc.edadJubilacion||65}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Coef. lucro cesante</label>
            <input id="cf-lucro" type="number" step="0.05" value="${fc.coeficienteLucroCesante||1.10}">
          </div>
        </div>
        <div class="config-section-label">Daños adicionales</div>
        <div class="config-row-4">
          <div class="config-field">
            <label class="config-field-label">% Daño moral</label>
            <input id="cf-moral" type="number" step="1" value="${Math.round((fc.porcentajeDanoMoral||0.30)*100)}">
          </div>
          <div class="config-field">
            <label class="config-field-label">% Daño estético</label>
            <input id="cf-estetico" type="number" step="1" value="${Math.round((fc.porcentajeDanoEstetico||0.08)*100)}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Gastos médicos c/cirugía</label>
            <input id="cf-gcir" type="number" step="50000" value="${fc.gastosMedicosCirugia||350000}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Gastos médicos leve</label>
            <input id="cf-glev" type="number" step="10000" value="${fc.gastosMedicosLeve||120000}">
          </div>
        </div>
        <div class="config-section-label">Factores de rango (mín / máx del estimado)</div>
        <div class="config-row-2" style="max-width:380px">
          <div class="config-field">
            <label class="config-field-label">Factor mínimo</label>
            <input id="cf-fmin" type="number" step="0.05" value="${fc.factorMinimo||0.70}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Factor máximo</label>
            <input id="cf-fmax" type="number" step="0.05" value="${fc.factorMaximo||1.40}">
          </div>
        </div>
        <div class="config-section-label">Tabla de incapacidad (%)</div>
        <div class="config-row-3">
          ${incapRow('cf-ic-leve',      'Leve',       (fc.tablaIncapacidad?.leve     ||0.08)*100)}
          ${incapRow('cf-ic-moderada',  'Moderada',   (fc.tablaIncapacidad?.moderada  ||0.15)*100)}
          ${incapRow('cf-ic-grave',     'Grave',      (fc.tablaIncapacidad?.grave     ||0.30)*100)}
          ${incapRow('cf-ic-muygrave',  'Muy grave',  (fc.tablaIncapacidad?.muyGrave  ||0.50)*100)}
          ${incapRow('cf-ic-fallec',    'Fallecimiento',(fc.tablaIncapacidad?.fallecimiento||1.0)*100)}
        </div>
        <div class="config-save-bar">
          <button class="btn btn-teal btn-sm" onclick="JV_DASH.saveFormula()">Guardar fórmula</button>
          <span class="config-save-msg" id="msg-formula">✓ Guardado</span>
        </div>
      `)}

      ${accordion('scoring', '🎯', 'Pesos de scoring', 'Puntos por cada factor de calidad del lead', `
        <div class="config-section-label">Puntos por factor</div>
        <div class="config-row-3">
          ${scoreRow('cf-sc-lesiones',  'Lesiones graves',   sc.lesionesGraves           ||15)}
          ${scoreRow('cf-sc-cirugia',   'Cirugía',           sc.cirugia                  ||15)}
          ${scoreRow('cf-sc-aseg',      'Aseguradora ident.',sc.aseguradoraIdentificada   ||20)}
          ${scoreRow('cf-sc-tercero',   'Tercero ident.',    sc.terceroIdentificado       ||15)}
          ${scoreRow('cf-sc-acta',      'Acta policial',     sc.actaPolicial              ||15)}
          ${scoreRow('cf-sc-ingreso',   'Ingreso alto',      sc.ingresoAlto               ||10)}
          ${scoreRow('cf-sc-edad',      'Edad productiva',   sc.edadProductiva            ||5)}
        </div>
        <div class="config-section-label">Umbrales de clasificación</div>
        <div class="config-row-3" style="max-width:480px">
          <div class="config-field">
            <label class="config-field-label">Umbral ALTO (≥)</label>
            <input id="cf-sc-ualto" type="number" step="1" value="${sc.umbrales?.alto||75}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Umbral MEDIO (≥)</label>
            <input id="cf-sc-umedio" type="number" step="1" value="${sc.umbrales?.medio||40}">
          </div>
          <div class="config-field">
            <label class="config-field-label">Ingreso "alto" (ARS)</label>
            <input id="cf-sc-umbingreso" type="number" step="50000" value="${sc.umbralIngresoAlto||400000}">
          </div>
        </div>
        <div class="config-save-bar">
          <button class="btn btn-teal btn-sm" onclick="JV_DASH.saveScoring()">Guardar scoring</button>
          <span class="config-save-msg" id="msg-scoring">✓ Guardado</span>
        </div>
      `)}

      ${accordion('keywords', '🔤', 'Keywords NLP', 'Palabras clave para scoring automático de descripciones', renderKeywordsBody())}

      ${accordion('whatsapp', '💬', 'Mensajes de WhatsApp', 'Templates para contactar leads automáticamente', `
        <div class="wa-template-wrap">
          <div class="wa-template-label">Mensaje del calculador (lo envía el lead)</div>
          <textarea id="cf-wa-calc">${esc(wa.leadCalculador||JV_CONFIG.mensajes?.leadCalculador||'')}</textarea>
        </div>
        <div class="wa-template-wrap">
          <div class="wa-template-label">Mensaje de bienvenida (lo envía el estudio)</div>
          <textarea id="cf-wa-bienvenida">${esc(wa.bienvenida||JV_CONFIG.mensajes?.bienvenida||'')}</textarea>
        </div>
        <div class="wa-template-wrap">
          <div class="wa-template-label">Mensaje de seguimiento</div>
          <textarea id="cf-wa-seguimiento">${esc(wa.seguimiento||JV_CONFIG.mensajes?.seguimiento||'')}</textarea>
        </div>
        <div class="wa-vars">
          Variables disponibles: <code>{nombre}</code> <code>{monto_min}</code> <code>{monto_max}</code> <code>{ciudad}</code> <code>{score}</code>
        </div>
        <div class="config-save-bar">
          <button class="btn btn-teal btn-sm" onclick="JV_DASH.saveWA()">Guardar mensajes</button>
          <span class="config-save-msg" id="msg-wa">✓ Guardado</span>
        </div>
      `)}

      ${accordion('landing', '📄', 'Textos de la landing', 'Títulos, subtítulos y disclaimer de la página pública', `
        <div class="config-field">
          <label class="config-field-label">Título principal (Hero)</label>
          <input id="cf-lt-titulo" type="text" value="${esc(lt.heroTitulo||'')}">
        </div>
        <div class="config-field">
          <label class="config-field-label">Subtítulo</label>
          <input id="cf-lt-sub" type="text" value="${esc(lt.heroSubtitulo||'')}">
        </div>
        <div class="config-field">
          <label class="config-field-label">Botón principal (CTA)</label>
          <input id="cf-lt-cta" type="text" value="${esc(lt.heroCta||'')}">
        </div>
        <div class="config-field">
          <label class="config-field-label">Disclaimer legal</label>
          <textarea id="cf-lt-disc">${esc(lt.disclaimer||'')}</textarea>
        </div>
        <div class="config-save-bar">
          <button class="btn btn-teal btn-sm" onclick="JV_DASH.saveLanding()">Guardar textos</button>
          <span class="config-save-msg" id="msg-landing">✓ Guardado</span>
        </div>
      `)}

      ${accordion('cuenta', '👤', 'Mi cuenta', 'Cambiar contraseña y datos de acceso', `
        <div class="password-form">
          <div class="config-field">
            <label class="config-field-label">Nueva contraseña</label>
            <input id="cf-pass1" type="password" placeholder="Mínimo 8 caracteres">
          </div>
          <div class="config-field">
            <label class="config-field-label">Confirmar nueva contraseña</label>
            <input id="cf-pass2" type="password" placeholder="Repetir contraseña">
          </div>
          <div class="config-save-bar">
            <button class="btn btn-teal btn-sm" onclick="JV_DASH.changePassword()">Cambiar contraseña</button>
            <span class="config-save-msg" id="msg-pass">✓ Contraseña actualizada</span>
          </div>
        </div>
      `)}

    </div>`;
  }

  function accordion(id, emoji, title, sub, body) {
    return `
      <div class="config-accordion" id="acc-${id}">
        <div class="config-accordion-header" onclick="JV_DASH.toggleAccordion('${id}')">
          <div class="config-accordion-left">
            <div class="config-accordion-emoji">${emoji}</div>
            <div>
              <div class="config-accordion-title">${title}</div>
              <div class="config-accordion-sub">${sub}</div>
            </div>
          </div>
          <span class="config-accordion-chevron" id="chevron-${id}">▼</span>
        </div>
        <div class="config-accordion-body" id="body-${id}">
          <div style="padding-top:14px">${body}</div>
        </div>
      </div>`;
  }

  function incapRow(id, label, val) {
    return `<div class="config-field">
      <label class="config-field-label">${label} (%)</label>
      <input id="${id}" type="number" step="1" min="0" max="100" value="${Math.round(val)}">
    </div>`;
  }

  function scoreRow(id, label, val) {
    return `<div class="config-field">
      <label class="config-field-label">${label}</label>
      <input id="${id}" type="number" step="1" min="0" value="${val}">
    </div>`;
  }

  function renderKeywordsBody() {
    const rows = keywordsData.map(kw => `
      <tr>
        <td>${esc(kw.keyword)}</td>
        <td><span class="kw-category kw-cat-${kw.category}">${kw.category}</span></td>
        <td class="${kw.score_impact >= 0 ? 'kw-impact-pos' : 'kw-impact-neg'}">
          ${kw.score_impact >= 0 ? '+' : ''}${kw.score_impact}
        </td>
        <td style="text-align:center">
          <span style="font-size:11px;color:${kw.is_active?'#27AE60':'#94A3B8'};font-weight:700">
            ${kw.is_active ? '● Activa' : '○ Inactiva'}
          </span>
        </td>
        <td>
          <button class="btn-icon-del" data-id="${kw.id}" onclick="JV_DASH.deleteKeyword(this.dataset.id)">🗑</button>
        </td>
      </tr>
    `).join('');

    return `
      <div style="max-height:320px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:12px">
        <table class="kw-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Categoría</th>
              <th>Impacto</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="kw-tbody">
            ${rows.length ? rows : '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px">No hay keywords cargadas</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
        + Agregar keyword
      </div>
      <div class="kw-add-form">
        <div>
          <label>Palabra clave</label>
          <input id="kw-new-word" type="text" placeholder="ej: fractura">
        </div>
        <div>
          <label>Categoría</label>
          <select id="kw-new-cat">
            <option value="gravedad">gravedad</option>
            <option value="incapacidad">incapacidad</option>
            <option value="fatal">fatal</option>
            <option value="agravante">agravante</option>
            <option value="evidencia">evidencia</option>
            <option value="debilidad">debilidad</option>
          </select>
        </div>
        <div>
          <label>Impacto (pts)</label>
          <input id="kw-new-impact" type="number" placeholder="ej: 15" value="10">
        </div>
        <button class="btn btn-teal btn-sm" onclick="JV_DASH.addKeyword()" style="margin-top:0">Agregar</button>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  // ACCIONES: LEADS
  // ══════════════════════════════════════════
  async function moveCase(caseId, newStage) {
    const { error } = await JV_API.updateCaseStage(caseId, newStage);
    if (error) { showToast('Error al mover caso', 'error'); return; }
    const c = casesData.find(x => x.id === caseId);
    if (c) c.stage = STAGE_DB_MAP[newStage] || newStage;
    renderPipelinePanel();
    showToast('Caso avanzado a ' + (STAGES[STAGE_DB_MAP[newStage] || newStage] || newStage), 'success', 2500);
  }

  async function refreshLeads() {
    showToast('Actualizando leads...', 'info', 1500);
    await loadLeads();
    renderLeadsPanel();
  }

  function quickStatus(triggerEl, id) {
    // Cerrar cualquier dropdown abierto
    document.querySelectorAll('.quick-status-menu').forEach(m => m.remove());

    const STATUSES = [
      { value: 'nuevo',      label: '🔵 Nuevo' },
      { value: 'contactado', label: '🟣 Contactado' },
      { value: 'evaluacion', label: '🟡 En evaluación' },
      { value: 'aceptado',   label: '🟢 Aceptado' },
      { value: 'rechazado',  label: '⚪ Rechazado' },
    ];

    const menu = document.createElement('div');
    menu.className = 'quick-status-menu';
    menu.innerHTML = STATUSES.map(s => `
      <button class="qs-option" data-id="${id}" data-status="${s.value}"
        onclick="JV_DASH.setStatus('${id}','${s.value}')">
        ${s.label}
      </button>`).join('');

    // Posicionar bajo el badge
    const rect = triggerEl.getBoundingClientRect();
    menu.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (rect.left  + window.scrollX)      + 'px';

    document.body.appendChild(menu);

    // Click fuera cierra el menu
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', handler); }
      });
    }, 50);
  }

  async function setStatus(id, newStatus) {
    document.querySelectorAll('.quick-status-menu').forEach(m => m.remove());
    const { error } = await JV_API.updateLeadStatus(id, newStatus, currentUser.id);
    if (error) { showToast('Error al actualizar estado', 'error'); return; }
    const l = leadsData.find(x => x.id === id);
    if (l) l.status = newStatus;
    updateLeadsBadge();
    renderLeadsPanel();
    showToast('Estado actualizado', 'success', 2000);
  }

  async function acceptLead(id, btn) {
    if (!confirm('¿Aceptar este caso y crear el expediente?')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }
    const { data, error } = await JV_API.acceptLead(id, currentUser.id);
    if (error) {
      showToast('Error: ' + (error.message || JSON.stringify(error)), 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✓ Aceptar caso'; }
      return;
    }
    await Promise.all([loadLeads(), loadCases()]);
    closeSlideOver();
    renderLeadsPanel();
    showToast('✅ Caso creado: ' + (data.case_title || 'expediente generado'), 'success', 4000);
  }

  async function contactLead(id) {
    const { error } = await JV_API.updateLeadStatus(id, 'contactado', currentUser.id);
    if (!error) {
      closeSlideOver();
      await loadLeads();
      renderLeadsPanel();
      showToast('Lead marcado como contactado', 'success', 2000);
    } else {
      showToast('Error al actualizar estado', 'error');
    }
  }

  async function rejectLead(id) {
    if (!confirm('¿Rechazar este lead?')) return;
    const { error } = await JV_API.updateLeadStatus(id, 'rechazado');
    if (!error) {
      closeSlideOver();
      await loadLeads();
      renderLeadsPanel();
      showToast('Lead rechazado', 'warning', 2000);
    } else {
      showToast('Error al rechazar lead', 'error');
    }
  }

  // ══════════════════════════════════════════
  // ACCIONES: CONFIG SAVES
  // ══════════════════════════════════════════
  async function saveStudio() {
    const data = {
      name       : v('cf-nombre'),
      email      : v('cf-email'),
      whatsapp   : v('cf-wa'),
      phone      : v('cf-tel'),
      address    : v('cf-dir'),
      city       : v('cf-ciudad'),
      jurisdiction: v('cf-jur'),
      matricula  : v('cf-mat'),
    };
    const { error } = await JV_API.updateTenantConfig(currentUser.tenant_id, 'datos', data);
    if (!error) {
      Object.assign(currentTenant, data);
      document.getElementById('tenantName').textContent = data.name || currentTenant.name;
      showToast('Datos del estudio guardados', 'success');
    } else showToast('Error: ' + error.message, 'error');
  }

  async function saveFormula() {
    const formula = {
      coeficienteVuoto         : +v('cf-vuoto'),
      edadJubilacion           : +v('cf-jubilacion'),
      coeficienteLucroCesante  : +v('cf-lucro'),
      porcentajeDanoMoral      : +v('cf-moral') / 100,
      porcentajeDanoEstetico   : +v('cf-estetico') / 100,
      gastosMedicosCirugia     : +v('cf-gcir'),
      gastosMedicosLeve        : +v('cf-glev'),
      factorMinimo             : +v('cf-fmin'),
      factorMaximo             : +v('cf-fmax'),
      tablaIncapacidad: {
        sinLesiones : 0,
        leve        : +v('cf-ic-leve') / 100,
        moderada    : +v('cf-ic-moderada') / 100,
        grave       : +v('cf-ic-grave') / 100,
        muyGrave    : +v('cf-ic-muygrave') / 100,
        fallecimiento: +v('cf-ic-fallec') / 100,
      },
    };
    const { error } = await JV_API.updateTenantConfig(currentUser.tenant_id, 'formula', formula);
    if (!error) { currentTenant.formula_config = formula; showToast('Fórmula Vuoto guardada', 'success'); }
    else showToast('Error: ' + error.message, 'error');
  }

  async function saveScoring() {
    const scoring = {
      lesionesGraves         : +v('cf-sc-lesiones'),
      cirugia                : +v('cf-sc-cirugia'),
      aseguradoraIdentificada: +v('cf-sc-aseg'),
      terceroIdentificado    : +v('cf-sc-tercero'),
      actaPolicial           : +v('cf-sc-acta'),
      ingresoAlto            : +v('cf-sc-ingreso'),
      edadProductiva         : +v('cf-sc-edad'),
      umbralIngresoAlto      : +v('cf-sc-umbingreso'),
      umbrales: {
        alto : +v('cf-sc-ualto'),
        medio: +v('cf-sc-umedio'),
      },
    };
    const { error } = await JV_API.updateTenantConfig(currentUser.tenant_id, 'scoring', scoring);
    if (!error) { currentTenant.scoring_config = scoring; showToast('Scoring guardado', 'success'); }
    else showToast('Error: ' + error.message, 'error');
  }

  async function saveWA() {
    const templates = {
      leadCalculador: v('cf-wa-calc'),
      bienvenida    : v('cf-wa-bienvenida'),
      seguimiento   : v('cf-wa-seguimiento'),
    };
    const { error } = await JV_API.updateTenantConfig(currentUser.tenant_id, 'whatsapp', templates);
    if (!error) { currentTenant.wa_templates = templates; showToast('Mensajes de WhatsApp guardados', 'success'); }
    else showToast('Error: ' + error.message, 'error');
  }

  async function saveLanding() {
    const texts = {
      heroTitulo  : v('cf-lt-titulo'),
      heroSubtitulo: v('cf-lt-sub'),
      heroCta     : v('cf-lt-cta'),
      disclaimer  : v('cf-lt-disc'),
    };
    const { error } = await JV_API.updateTenantConfig(currentUser.tenant_id, 'textos', texts);
    if (!error) { currentTenant.landing_texts = texts; showToast('Textos de la landing guardados', 'success'); }
    else showToast('Error: ' + error.message, 'error');
  }

  async function changePassword() {
    const p1 = v('cf-pass1');
    const p2 = v('cf-pass2');
    if (!p1 || p1.length < 8) { alert('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (p1 !== p2) { alert('Las contraseñas no coinciden.'); return; }
    const { error } = await JV_API.changePassword(p1);
    if (!error) {
      showToast('Contraseña actualizada correctamente', 'success');
      document.getElementById('cf-pass1').value = '';
      document.getElementById('cf-pass2').value = '';
    } else showToast('Error: ' + error.message, 'error');
  }

  // ══════════════════════════════════════════
  // ACCIONES: KEYWORDS
  // ══════════════════════════════════════════
  async function addKeyword() {
    const word   = v('kw-new-word').toLowerCase().trim();
    const cat    = v('kw-new-cat');
    const impact = parseInt(v('kw-new-impact'));

    if (!word) { alert('Ingresá una palabra clave.'); return; }
    if (isNaN(impact)) { alert('Ingresá un impacto numérico.'); return; }

    const { data, error } = await JV_API.addKeyword(currentUser.tenant_id, word, cat, impact);
    if (error) { showToast('Error: ' + (error.message || 'La keyword puede que ya exista.'), 'error'); return; }

    keywordsData.push(data);
    refreshKeywordsTable();
    showToast('Keyword agregada', 'success', 2000);
    document.getElementById('kw-new-word').value   = '';
    document.getElementById('kw-new-impact').value = '10';
  }

  async function deleteKeyword(id) {
    if (!confirm('¿Eliminar esta keyword?')) return;
    const { error } = await JV_API.deleteKeyword(id);
    if (!error) {
      keywordsData = keywordsData.filter(k => k.id !== id);
      refreshKeywordsTable();
      showToast('Keyword eliminada', 'warning', 2000);
    } else showToast('Error: ' + error.message, 'error');
  }

  function refreshKeywordsTable() {
    const tbody = document.getElementById('kw-tbody');
    if (!tbody) return;
    if (keywordsData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px">No hay keywords</td></tr>';
      return;
    }
    tbody.innerHTML = keywordsData.map(kw => `
      <tr>
        <td>${esc(kw.keyword)}</td>
        <td><span class="kw-category kw-cat-${kw.category}">${kw.category}</span></td>
        <td class="${kw.score_impact >= 0 ? 'kw-impact-pos' : 'kw-impact-neg'}">
          ${kw.score_impact >= 0 ? '+' : ''}${kw.score_impact}
        </td>
        <td style="text-align:center">
          <span style="font-size:11px;color:${kw.is_active?'#27AE60':'#94A3B8'};font-weight:700">
            ${kw.is_active ? '● Activa' : '○ Inactiva'}
          </span>
        </td>
        <td>
          <button class="btn-icon-del" data-id="${kw.id}" onclick="JV_DASH.deleteKeyword(this.dataset.id)">🗑</button>
        </td>
      </tr>
    `).join('');
  }

  // ══════════════════════════════════════════
  // USUARIOS — ABM
  // ══════════════════════════════════════════
  function renderUsersBody() {
    const buildRow = u => {
      const initials = (u.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const isSelf   = u.id === currentUser.id;
      return `
        <tr>
          <td>
            <div class="user-row-info">
              <div class="user-avatar-sm">${initials}</div>
              <div>
                <div class="user-name-cell">${esc(u.full_name || '—')}</div>
                ${isSelf ? '<div class="user-self-badge">Vos</div>' : ''}
              </div>
            </div>
          </td>
          <td class="user-email-cell">${esc(u.email)}</td>
          <td>
            <select class="user-role-select" data-id="${u.id}"
              onchange="JV_DASH.updateUserRole(this.dataset.id, this.value)"
              ${isSelf ? 'disabled title="No podés cambiar tu propio rol"' : ''}>
              <option value="admin"      ${u.role === 'admin'      ? 'selected' : ''}>👑 Admin</option>
              <option value="abogado"    ${u.role === 'abogado'    ? 'selected' : ''}>⚖️ Abogado/a</option>
              <option value="secretaria" ${u.role === 'secretaria' ? 'selected' : ''}>📋 Secretaria/o</option>
            </select>
          </td>
          <td>
            <button class="user-toggle-btn ${u.is_active ? 'active' : ''}"
              data-id="${u.id}" data-active="${u.is_active}"
              onclick="JV_DASH.toggleUserActive(this.dataset.id, this.dataset.active !== 'true')"
              ${isSelf ? 'disabled' : ''}>
              ${u.is_active ? '● Activo' : '○ Inactivo'}
            </button>
          </td>
          <td>
            ${!isSelf
              ? `<button class="btn-icon-del" data-id="${u.id}"
                  onclick="JV_DASH.deleteUser(this.dataset.id)" title="Eliminar usuario">🗑</button>`
              : ''}
          </td>
        </tr>`;
    };

    return `
      <div class="config-section-label">Usuarios del estudio</div>
      <div style="max-height:300px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:16px">
        <table class="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${usersData.length
              ? usersData.map(buildRow).join('')
              : '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:24px">No hay usuarios registrados</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="config-section-label">Permisos por rol</div>
      <div class="perms-info-grid">
        <div class="perms-role-card">
          <div class="perms-role-name">👑 Administrador</div>
          <ul class="perms-role-list">
            <li>Leads y contacto</li>
            <li>Pipeline de litigios</li>
            <li>Analíticas</li>
            <li>Configuración</li>
            <li>Gestión de usuarios</li>
          </ul>
        </div>
        <div class="perms-role-card">
          <div class="perms-role-name">⚖️ Abogado/a</div>
          <ul class="perms-role-list">
            <li>Leads y contacto</li>
            <li>Pipeline de litigios</li>
            <li>Analíticas</li>
            <li class="denied">Configuración</li>
            <li class="denied">Gestión de usuarios</li>
          </ul>
        </div>
        <div class="perms-role-card">
          <div class="perms-role-name">📋 Secretaria/o</div>
          <ul class="perms-role-list">
            <li>Leads y contacto</li>
            <li class="denied">Pipeline de litigios</li>
            <li class="denied">Analíticas</li>
            <li class="denied">Configuración</li>
            <li class="denied">Gestión de usuarios</li>
          </ul>
        </div>
      </div>

      <div class="config-section-label" style="margin-top:20px">+ Invitar nuevo usuario</div>
      <div class="user-invite-form">
        <div>
          <label>Nombre completo</label>
          <input id="inv-nombre" type="text" placeholder="Ej: María García">
        </div>
        <div>
          <label>Email</label>
          <input id="inv-email" type="email" placeholder="maria@estudio.com">
        </div>
        <div>
          <label>Contraseña temporal</label>
          <input id="inv-pass" type="text" placeholder="Mín. 8 caracteres">
        </div>
        <div>
          <label>Rol</label>
          <select id="inv-rol">
            <option value="abogado">⚖️ Abogado/a</option>
            <option value="secretaria">📋 Secretaria/o</option>
            <option value="admin">👑 Admin</option>
          </select>
        </div>
        <button class="btn btn-teal btn-sm" id="inv-btn" onclick="JV_DASH.inviteUser()" style="margin-top:0;align-self:end">
          Invitar →
        </button>
      </div>
      <div class="user-invite-note">
        📧 Se enviará un email de confirmación al usuario. Compartí la contraseña temporal de forma segura (por teléfono o mensaje directo).
      </div>
      <div style="margin-top:10px">
        <span class="config-save-msg" id="msg-users">✓ Usuario creado correctamente</span>
      </div>
    `;
  }

  function refreshUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    if (usersData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:24px">No hay usuarios</td></tr>';
      return;
    }
    tbody.innerHTML = usersData.map(u => {
      const initials = (u.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const isSelf   = u.id === currentUser.id;
      return `
        <tr>
          <td>
            <div class="user-row-info">
              <div class="user-avatar-sm">${initials}</div>
              <div>
                <div class="user-name-cell">${esc(u.full_name || '—')}</div>
                ${isSelf ? '<div class="user-self-badge">Vos</div>' : ''}
              </div>
            </div>
          </td>
          <td class="user-email-cell">${esc(u.email)}</td>
          <td>
            <select class="user-role-select" data-id="${u.id}"
              onchange="JV_DASH.updateUserRole(this.dataset.id, this.value)"
              ${isSelf ? 'disabled' : ''}>
              <option value="admin"      ${u.role === 'admin'      ? 'selected' : ''}>👑 Admin</option>
              <option value="abogado"    ${u.role === 'abogado'    ? 'selected' : ''}>⚖️ Abogado/a</option>
              <option value="secretaria" ${u.role === 'secretaria' ? 'selected' : ''}>📋 Secretaria/o</option>
            </select>
          </td>
          <td>
            <button class="user-toggle-btn ${u.is_active ? 'active' : ''}"
              data-id="${u.id}" data-active="${u.is_active}"
              onclick="JV_DASH.toggleUserActive(this.dataset.id, this.dataset.active !== 'true')"
              ${isSelf ? 'disabled' : ''}>
              ${u.is_active ? '● Activo' : '○ Inactivo'}
            </button>
          </td>
          <td>
            ${!isSelf
              ? `<button class="btn-icon-del" data-id="${u.id}"
                  onclick="JV_DASH.deleteUser(this.dataset.id)">🗑</button>`
              : ''}
          </td>
        </tr>`;
    }).join('');
  }

  async function inviteUser() {
    const nombre = v('inv-nombre').trim();
    const email  = v('inv-email').trim();
    const pass   = v('inv-pass').trim();
    const rol    = v('inv-rol');

    if (!nombre)         { alert('Ingresá el nombre completo del usuario.'); return; }
    if (!email)          { alert('Ingresá el email del usuario.'); return; }
    // Validar que el email solo tenga caracteres ASCII válidos (sin tildes ni ñ)
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
      alert('⚠ El email "' + email + '" tiene un formato inválido.\n\nLos emails no pueden contener tildes, ñ ni caracteres especiales (ej: á, é, í, ó, ú, ñ).\n\nRevisá que el email esté bien escrito.');
      return;
    }
    if (pass.length < 8) { alert('La contraseña temporal debe tener al menos 8 caracteres.'); return; }

    const btn = document.getElementById('inv-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }

    const { data, error } = await JV_API.inviteUser(currentUser.tenant_id, email, nombre, pass, rol);

    if (btn) { btn.disabled = false; btn.textContent = 'Invitar →'; }

    if (error) {
      const msg = error.message || JSON.stringify(error);
      if (msg.includes('already registered') || msg.includes('duplicate')) {
        showToast('⚠ Ese email ya está registrado en el sistema.', 'warning');
      } else if (msg.includes('invalid format') || msg.includes('validate email')) {
        showToast('Email inválido: no uses tildes ni caracteres especiales.', 'error');
      } else {
        showToast('Error al crear usuario: ' + msg, 'error');
      }
      return;
    }

    usersData.push(data);
    refreshUsersTable();
    document.getElementById('inv-nombre').value = '';
    document.getElementById('inv-email').value  = '';
    document.getElementById('inv-pass').value   = '';
    showToast('Usuario invitado correctamente. Se envió un email de confirmación.', 'success', 4000);
  }

  async function updateUserRole(userId, newRole) {
    const { error } = await JV_API.updateUserRole(userId, newRole);
    if (error) {
      showToast('Error al cambiar rol: ' + error.message, 'error');
      await loadUsers();
      refreshUsersTable();
      return;
    }
    showToast('Rol actualizado', 'success', 2000);
    const u = usersData.find(x => x.id === userId);
    if (u) u.role = newRole;
    // Aplicar acceso si el usuario modificado es el actual
    if (userId === currentUser.id) { currentUser.role = newRole; applyRoleAccess(); }
  }

  async function toggleUserActive(userId, newActive) {
    const { error } = await JV_API.toggleUserActive(userId, newActive);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    const u = usersData.find(x => x.id === userId);
    if (u) u.is_active = newActive;
    refreshUsersTable();
  }

  async function deleteUser(userId) {
    const u = usersData.find(x => x.id === userId);
    if (!u) return;
    if (u.id === currentUser.id) { alert('No podés eliminarte a vos mismo.'); return; }
    if (!confirm(`¿Eliminar al usuario "${u.full_name}"?\nEsta acción no se puede deshacer.`)) return;
    const { error } = await JV_API.deleteUser(userId);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    usersData = usersData.filter(x => x.id !== userId);
    refreshUsersTable();
    showToast('Usuario eliminado', 'warning', 2500);
  }

  // ══════════════════════════════════════════
  // ACCORDION
  // ══════════════════════════════════════════
  function toggleAccordion(id) {
    const body    = document.getElementById('body-' + id);
    const chevron = document.getElementById('chevron-' + id);
    if (!body) return;
    const isOpen = body.classList.toggle('open');
    chevron.classList.toggle('open', isOpen);
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════
  function v(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function flashMsg(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2500);
  }

  function showLoading(visible) {
    let overlay = document.getElementById('dashLoadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dashLoadingOverlay';
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(255,255,255,0.9);
        display:flex;align-items:center;justify-content:center;
        z-index:9999;flex-direction:column;gap:12px;font-size:15px;color:#64748B;
      `;
      overlay.innerHTML = `
        <div style="width:42px;height:42px;border:3px solid #E2E8F0;
          border-top-color:#2E86AB;border-radius:50%;
          animation:spin 0.8s linear infinite"></div>
        <div>Cargando JusticiaVial...</div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = visible ? 'flex' : 'none';
  }

  function updateLeadsBadge() {
    const badge = document.getElementById('leadsBadge');
    if (!badge) return;
    const count = leadsData.filter(l => l.status === 'nuevo').length;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days}d`;
  }

  function waNum(wa) { return (wa || '').replace(/[^0-9]/g, ''); }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtAccidentType(t) {
    const m = {
      colision_vehicular:'Colisión vehicular', atropello_peaton:'Atropello de peatón',
      colision_moto:'Colisión con moto', vuelco:'Vuelco', choque_cadena:'Choque en cadena',
      transporte_publico:'Transporte público', otro:'Otro',
    };
    return m[t] || t || 'No especificado';
  }

  // ══════════════════════════════════════════
  // API PÚBLICA
  // ══════════════════════════════════════════
  window.JV_DASH = {
    setFilter   : f   => { activeFilter = f; renderLeadsPanel(); },
    showDetail  : id  => showLeadDetail(id),
    search      : q   => { searchQuery = q; renderLeadsPanel(); },
    acceptLead  : (id, btn) => acceptLead(id, btn),
    contactLead : id  => contactLead(id),
    rejectLead  : id  => rejectLead(id),
    toggleAccordion: id => toggleAccordion(id),
    saveStudio  : ()  => saveStudio(),
    saveFormula : ()  => saveFormula(),
    saveScoring : ()  => saveScoring(),
    saveWA      : ()  => saveWA(),
    saveLanding : ()  => saveLanding(),
    changePassword: ()=> changePassword(),
    addKeyword  : ()  => addKeyword(),
    deleteKeyword: id => deleteKeyword(id),
    inviteUser  : ()  => inviteUser(),
    updateUserRole  : (id, role)   => updateUserRole(id, role),
    toggleUserActive: (id, active) => toggleUserActive(id, active),
    deleteUser  : id  => deleteUser(id),
    sortLeads   : f   => sortLeads(f),
    refreshLeads: ()  => refreshLeads(),
    quickStatus : (el, id) => quickStatus(el, id),
    setStatus   : (id, s)  => setStatus(id, s),
    closeDetail : ()  => closeSlideOver(),
    moveCase    : (id, stage) => moveCase(id, stage),
    async logout() {
      if (realtimeSub) JV_API.unsubscribe(realtimeSub);
      await JV_API.logout();
      window.location.href = 'login.html';
    },
  };

})();
