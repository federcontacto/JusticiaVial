/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Dashboard Controller
   ══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ══════════════════════════════════════════
  // SAMPLE DATA (replace with API calls)
  // ══════════════════════════════════════════
  const LEADS = [
    {id:1,name:'Laura Gómez',city:'CABA',wa:'+54 9 11 5555-0101',age:34,income:620000,score:87,level:'alto',status:'nuevo',min:4200000,max:8400000,desc:'Colisión en Panamericana. Fractura de clavícula con cirugía. 45 días de baja. Tercero identificado con seguro La Segunda.',ai:'Caso de alta viabilidad. Fractura documentada + cirugía elevan significativamente el monto. Aseguradora solvente identificada. Probabilidad de éxito estimada: 82%.',risks:['Demora en denuncia policial'],docs:3,date:'Hace 2 horas',injury:'Fractura clavícula + cirugía',insurer:'La Segunda',policeReport:true,thirdParty:true,sickDays:45,type:'Colisión vehicular'},
    {id:2,name:'Carlos Méndez',city:'La Plata',wa:'+54 9 221 555-0202',age:52,income:480000,score:72,level:'medio',status:'contactado',min:1800000,max:3600000,desc:'Atropello como peatón cruzando senda peatonal. Esguince de tobillo. Testigos presentes. Conductor se dio a la fuga.',ai:'Viabilidad media-alta. Fuga del conductor complica identificación. Testigos fortalecen el caso. Recomendación: solicitar filmaciones de cámaras del municipio.',risks:['Fuga del conductor','Sin datos del seguro'],docs:1,date:'Hace 5 horas',injury:'Esguince tobillo',insurer:'No identificada',policeReport:true,thirdParty:false,sickDays:20,type:'Atropello de peatón'},
    {id:3,name:'Valentina Ruiz',city:'Avellaneda',wa:'+54 9 11 5555-0303',age:28,income:350000,score:91,level:'alto',status:'nuevo',min:9500000,max:19000000,desc:'Choque frontal en ruta 2. Traumatismo de cráneo + fractura de fémur. Internación 12 días en terapia intensiva. Conductor del otro vehículo con alcoholemia positiva.',ai:'Caso prioritario. Lesiones graves con internación prolongada. Alcoholemia del tercero es agravante determinante. Probabilidad de éxito: 91%. Recomendar pericia médica urgente.',risks:['Secuelas neurológicas pendientes'],docs:5,date:'Hace 30 min',injury:'TEC + fractura fémur',insurer:'Sancor Seguros',policeReport:true,thirdParty:true,sickDays:90,type:'Colisión vehicular'},
    {id:4,name:'Roberto Pereyra',city:'Quilmes',wa:'+54 9 11 5555-0404',age:45,income:550000,score:48,level:'medio',status:'evaluacion',min:850000,max:1700000,desc:'Choque por alcance en autopista. Daños materiales importantes. Dolor cervical sin diagnóstico claro.',ai:'Viabilidad media. Daño material comprobable pero lesiones difíciles de acreditar sin estudios. Solicitar RMN cervical.',risks:['Lesión no objetivada','Posible preexistencia'],docs:2,date:'Hace 1 día',injury:'Cervicalgia',insurer:'Federación Patronal',policeReport:true,thirdParty:true,sickDays:10,type:'Colisión vehicular'},
    {id:5,name:'Ana Belén Torres',city:'Mar del Plata',wa:'+54 9 223 555-0505',age:31,income:290000,score:33,level:'bajo',status:'nuevo',min:180000,max:360000,desc:'Toque leve en estacionamiento. Sin lesiones. Solo daño al paragolpes. No tiene datos del otro conductor.',ai:'Baja viabilidad. Sin lesiones personales, reclamo limitado a daño material menor. Sin datos del tercero. Recomendación: rechazar o derivar.',risks:['Sin lesiones','Sin tercero','Daño menor'],docs:0,date:'Hace 2 días',injury:'Sin lesiones',insurer:'No identificada',policeReport:false,thirdParty:false,sickDays:0,type:'Colisión vehicular'},
    {id:6,name:'Diego Fernández',city:'Paraná',wa:'+54 9 343 555-0606',age:40,income:410000,score:65,level:'medio',status:'contactado',min:2100000,max:4200000,desc:'Accidente en moto. Fractura de tibia. 30 días de yeso. Seguro Zurich identificado. Acta policial labrada.',ai:'Viabilidad buena. Fractura documentada con acta policial. Seguro solvente. Recomendación: aceptar y solicitar pericia.',risks:['Posible culpa concurrente'],docs:2,date:'Hace 8 horas',injury:'Fractura tibia',insurer:'Zurich',policeReport:true,thirdParty:true,sickDays:30,type:'Colisión con moto'},
    {id:7,name:'Lucía Ramírez',city:'Posadas',wa:'+54 9 376 555-0707',age:26,income:280000,score:78,level:'alto',status:'nuevo',min:5800000,max:11600000,desc:'Pasajera de colectivo que volcó en ruta 12. Fractura de cadera + luxación de hombro. Internación 8 días.',ai:'Alta viabilidad. Víctima pasajera = responsabilidad objetiva del transportista. Lesiones graves. Probabilidad de éxito: 88%.',risks:['Jurisdicción Misiones (tiempos largos)'],docs:4,date:'Hace 4 horas',injury:'Fractura cadera + luxación',insurer:'San Cristóbal',policeReport:true,thirdParty:true,sickDays:75,type:'Transporte público'},
  ];

  const CASES = [
    {name:'María López',stage:'extrajudicial',amount:3200000,date:'12/02/2026',insurer:'Mapfre'},
    {name:'Juan Pérez',stage:'extrajudicial',amount:1800000,date:'05/02/2026',insurer:'Allianz'},
    {name:'Sofía Blanc',stage:'mediacion',amount:5100000,date:'20/01/2026',insurer:'La Segunda'},
    {name:'Tomás Vega',stage:'mediacion',amount:2400000,date:'15/01/2026',insurer:'Sancor'},
    {name:'Paula Ríos',stage:'demanda',amount:7800000,date:'10/12/2025',insurer:'Zurich'},
    {name:'Martín Sosa',stage:'demanda',amount:4500000,date:'01/12/2025',insurer:'Fed. Patronal'},
    {name:'Andrea Díaz',stage:'demanda',amount:6200000,date:'15/11/2025',insurer:'San Cristóbal'},
    {name:'Ramiro Gil',stage:'prueba',amount:9100000,date:'01/09/2025',insurer:'La Segunda'},
    {name:'Elena Ruiz',stage:'prueba',amount:3800000,date:'20/08/2025',insurer:'Rivadavia'},
    {name:'Fabián Mora',stage:'sentencia',amount:5600000,date:'01/06/2025',insurer:'Mapfre'},
  ];

  const STAGES = {
    extrajudicial: 'Reclamo extrajudicial',
    mediacion: 'Mediación',
    demanda: 'Demanda',
    prueba: 'Prueba',
    sentencia: 'Sentencia / Ejecución'
  };

  const STAGE_KEYS = ['extrajudicial','mediacion','demanda','prueba','sentencia'];

  // ── State ──
  let activeTab = 'leads';
  let activeFilter = 'todos';
  let selectedLeadId = null;

  // ── Initialize ──
  document.addEventListener('DOMContentLoaded', () => {
    // Tab navigation
    document.querySelectorAll('.dash-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        switchTab(tab);
      });
    });

    // Initial render
    switchTab('leads');
  });

  // ── Tab Switching ──
  function switchTab(tab) {
    activeTab = tab;
    selectedLeadId = null;

    document.querySelectorAll('.dash-nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.tab === tab)
    );
    document.querySelectorAll('.dash-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'panel-' + tab)
    );

    switch (tab) {
      case 'leads': renderLeadsPanel(); break;
      case 'pipeline': renderPipelinePanel(); break;
      case 'config': renderConfigPanel(); break;
    }
  }

  // ══════════════════════════════════════════
  // LEADS PANEL
  // ══════════════════════════════════════════
  function renderLeadsPanel() {
    const panel = document.getElementById('panel-leads');
    const filtered = activeFilter === 'todos' 
      ? LEADS 
      : LEADS.filter(l => l.level === activeFilter);

    const totalMin = LEADS.reduce((a, l) => a + l.min, 0);
    const altos = LEADS.filter(l => l.level === 'alto').length;
    const nuevos = LEADS.filter(l => l.status === 'nuevo').length;
    const avgScore = Math.round(LEADS.reduce((a, l) => a + l.score, 0) / LEADS.length);
    const fmt = JV_ENGINE.formatARS;

    panel.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Leads este mes</div>
          <div class="metric-value">${LEADS.length}</div>
          <div class="metric-delta metric-up">+23% vs mes anterior</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Score promedio</div>
          <div class="metric-value">${avgScore}</div>
          <div class="metric-delta metric-up">+8 pts vs mes anterior</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Leads prioritarios</div>
          <div class="metric-value">${altos}</div>
          <div class="metric-delta" style="color:var(--jv-success)">${nuevos} nuevos sin contactar</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Monto potencial</div>
          <div class="metric-value" style="font-size:20px">${fmt(totalMin)}</div>
          <div class="metric-delta">estimado mínimo acumulado</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Leads recientes</div>
        <div class="filter-bar">
          <button class="filter-chip ${activeFilter==='todos'?'active':''}" onclick="JV_DASH.setFilter('todos')">Todos (${LEADS.length})</button>
          <button class="filter-chip ${activeFilter==='alto'?'active':''}" onclick="JV_DASH.setFilter('alto')">Alto (${LEADS.filter(l=>l.level==='alto').length})</button>
          <button class="filter-chip ${activeFilter==='medio'?'active':''}" onclick="JV_DASH.setFilter('medio')">Medio (${LEADS.filter(l=>l.level==='medio').length})</button>
          <button class="filter-chip ${activeFilter==='bajo'?'active':''}" onclick="JV_DASH.setFilter('bajo')">Bajo (${LEADS.filter(l=>l.level==='bajo').length})</button>
        </div>
      </div>

      <div class="leads-table-wrap">
        <div class="leads-table-scroll">
          <table class="leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Score</th>
                <th>Estado</th>
                <th>Estimado</th>
                <th>Resumen IA</th>
                <th style="text-align:center">Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(l => `
                <tr onclick="JV_DASH.showDetail(${l.id})">
                  <td>
                    <div class="lead-cell-name">${l.name}</div>
                    <div class="lead-cell-city">${l.city} · ${l.date}</div>
                  </td>
                  <td><span class="badge badge-${l.level}">${l.score}/100</span></td>
                  <td><span class="badge badge-${l.status}">${l.status}</span></td>
                  <td>
                    <div class="lead-cell-amount">${fmt(l.min)}</div>
                    <div class="lead-cell-amount-max">a ${fmt(l.max)}</div>
                  </td>
                  <td><div class="lead-cell-summary">${l.ai}</div></td>
                  <td class="lead-cell-docs">${l.docs}</td>
                  <td>
                    <button class="btn-wa-sm" onclick="event.stopPropagation(); window.open('https://wa.me/${l.wa.replace(/[^0-9]/g,'')}','_blank')">
                      WA
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div id="leadDetailArea"></div>
    `;
  }

  // ── Lead Detail ──
  function showLeadDetail(id) {
    const l = LEADS.find(x => x.id === id);
    if (!l) return;
    selectedLeadId = id;

    const fmt = JV_ENGINE.formatARS;
    const area = document.getElementById('leadDetailArea');

    area.innerHTML = `
      <div class="lead-detail">
        <div class="lead-detail-header">
          <div>
            <div class="lead-detail-name">${l.name}</div>
            <div class="lead-detail-meta">${l.city} · ${l.type} · ${l.date}</div>
          </div>
          <div class="lead-detail-actions">
            <span class="badge badge-${l.level}" style="font-size:13px;padding:6px 14px">
              ${l.score}/100 — ${l.level.toUpperCase()}
            </span>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('leadDetailArea').innerHTML=''">
              Cerrar
            </button>
          </div>
        </div>

        <div class="lead-fields-grid">
          <div class="lead-field">
            <div class="lead-field-label">Edad</div>
            <div class="lead-field-value">${l.age} años</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Ingreso mensual</div>
            <div class="lead-field-value">${fmt(l.income)}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Lesión</div>
            <div class="lead-field-value">${l.injury}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Aseguradora</div>
            <div class="lead-field-value">${l.insurer}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Acta policial</div>
            <div class="lead-field-value">${l.policeReport ? 'Sí' : 'No'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Datos del tercero</div>
            <div class="lead-field-value">${l.thirdParty ? 'Sí' : 'No'}</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">Días de baja</div>
            <div class="lead-field-value">${l.sickDays} días</div>
          </div>
          <div class="lead-field">
            <div class="lead-field-label">WhatsApp</div>
            <div class="lead-field-value">${l.wa}</div>
          </div>
        </div>

        <div class="lead-description">
          <div class="lead-description-label">Descripción del caso</div>
          <div class="lead-description-text">${l.desc}</div>
        </div>

        <div class="ai-analysis">
          <div class="ai-analysis-title">🤖 Análisis de IA</div>
          <div class="ai-analysis-text">${l.ai}</div>
          <div class="ai-risks">
            ${l.risks.map(r => `<span class="ai-risk-tag">⚠ ${r}</span>`).join('')}
          </div>
        </div>

        <div class="lead-estimate-box">
          <div class="lead-estimate-label">Indemnización estimada</div>
          <div class="lead-estimate-amount">${fmt(l.min)} — ${fmt(l.max)}</div>
        </div>

        <div class="lead-action-bar">
          <button class="btn btn-success btn-sm" onclick="JV_DASH.acceptLead(${l.id})">
            ✓ Aceptar caso
          </button>
          <button class="btn btn-outline btn-sm" style="color:var(--jv-teal)">
            ℹ Solicitar más info
          </button>
          <button class="btn btn-danger-outline btn-sm">
            ✕ Rechazar
          </button>
          <button class="btn btn-whatsapp btn-sm" onclick="window.open('https://wa.me/${l.wa.replace(/[^0-9]/g,'')}','_blank')">
            WhatsApp
          </button>
        </div>
      </div>
    `;

    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ══════════════════════════════════════════
  // PIPELINE PANEL
  // ══════════════════════════════════════════
  function renderPipelinePanel() {
    const panel = document.getElementById('panel-pipeline');
    const fmt = JV_ENGINE.formatARS;

    const grouped = {};
    STAGE_KEYS.forEach(s => grouped[s] = []);
    CASES.forEach(c => { if (grouped[c.stage]) grouped[c.stage].push(c); });

    const totalAmount = CASES.reduce((a, c) => a + c.amount, 0);
    const inDemanda = CASES.filter(c => c.stage === 'demanda').length;

    panel.innerHTML = `
      <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="metric-card">
          <div class="metric-label">Casos activos</div>
          <div class="metric-value">${CASES.length}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">En demanda</div>
          <div class="metric-value">${inDemanda}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Honorarios potenciales</div>
          <div class="metric-value" style="font-size:20px">${fmt(totalAmount * 0.2)}</div>
        </div>
      </div>

      <div class="section-title mb-sm">Pipeline de litigios</div>
      <p style="font-size:13px;color:var(--jv-gray-500);margin-bottom:16px">
        Vista de las etapas del litigio. Cada tarjeta representa un caso activo.
      </p>

      <div class="kanban-board">
        ${STAGE_KEYS.map(s => `
          <div class="kanban-column">
            <div class="kanban-col-header">
              <div class="kanban-col-title">${STAGES[s]}</div>
              <div class="kanban-col-count">${grouped[s].length}</div>
            </div>
            ${grouped[s].map(c => `
              <div class="kanban-card">
                <div class="kc-name">${c.name}</div>
                <div class="kc-sub">${c.insurer}</div>
                <div class="kc-footer">
                  <div class="kc-amount">${fmt(c.amount)}</div>
                  <div class="kc-date">${c.date}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ══════════════════════════════════════════
  // CONFIG PANEL
  // ══════════════════════════════════════════
  function renderConfigPanel() {
    const panel = document.getElementById('panel-config');
    const cfg = JV_CONFIG;

    const kwRows = cfg.keywords.slice(0, 15).map(kw => `
      <tr>
        <td>${kw.palabra}</td>
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
        <div class="config-row">
          <span class="config-label">% Daño estético (si cirugía)</span>
          <div><input class="config-input" type="number" value="${Math.round(cfg.formula.porcentajeDanoEstetico*100)}" step="1"><span class="config-suffix">%</span></div>
        </div>
        <div class="config-row">
          <span class="config-label">Coeficiente lucro cesante</span>
          <div><input class="config-input" type="number" value="${cfg.formula.coeficienteLucroCesante}" step="0.05"></div>
        </div>
        <div class="config-row">
          <span class="config-label">Edad de jubilación</span>
          <div><input class="config-input" type="number" value="${cfg.formula.edadJubilacion}" step="1"><span class="config-suffix">años</span></div>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar cambios</button>
          <button class="btn btn-outline btn-sm">Restaurar valores predeterminados</button>
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
          <textarea>${cfg.mensajes.bienvenida}</textarea>
        </div>
        <div class="wa-template">
          <div class="wa-template-label">Mensaje de seguimiento</div>
          <textarea>${cfg.mensajes.seguimiento}</textarea>
        </div>
        <div class="wa-template">
          <div class="wa-template-label">Mensaje del calculador (lo envía el lead)</div>
          <textarea>${cfg.mensajes.leadCalculador}</textarea>
        </div>
        <div class="wa-vars">
          Variables disponibles: <code>{nombre}</code> <code>{monto_min}</code> <code>{monto_max}</code> <code>{score}</code> <code>{ciudad}</code> <code>{link_caso}</code>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar mensajes</button>
        </div>
      </div>

      <div class="config-card">
        <div class="config-title">Textos de la landing page</div>
        <div class="landing-field">
          <div class="landing-field-label">Título principal</div>
          <input type="text" value="${cfg.textos.heroCta}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">Subtítulo</div>
          <input type="text" value="${cfg.textos.heroSubtitulo}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">CTA final</div>
          <input type="text" value="${cfg.textos.ctaFinal}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">Disclaimer legal</div>
          <textarea style="min-height:60px">${cfg.textos.disclaimer}</textarea>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar textos</button>
        </div>
      </div>

      <div class="config-card">
        <div class="config-title">Datos del estudio</div>
        <div class="landing-field">
          <div class="landing-field-label">Nombre del estudio</div>
          <input type="text" value="${cfg.estudio.nombre}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">WhatsApp</div>
          <input type="text" value="${cfg.estudio.whatsapp}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">Dirección</div>
          <input type="text" value="${cfg.estudio.direccion}">
        </div>
        <div class="landing-field">
          <div class="landing-field-label">Matrícula</div>
          <input type="text" value="${cfg.estudio.matricula}">
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-teal btn-sm">Guardar datos</button>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  // PUBLIC API (for onclick handlers)
  // ══════════════════════════════════════════
  window.JV_DASH = {
    setFilter(f) {
      activeFilter = f;
      renderLeadsPanel();
    },
    showDetail(id) {
      showLeadDetail(id);
    },
    acceptLead(id) {
      const lead = LEADS.find(x => x.id === id);
      if (lead) {
        lead.status = 'aceptado';
        renderLeadsPanel();
        alert('Caso aceptado. Se generará el contrato de representación para ' + lead.name + '.');
      }
    }
  };

})();
