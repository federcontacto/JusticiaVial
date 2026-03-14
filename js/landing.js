/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Landing Page Controller
   ══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── State ──
  const state = {
    step: 1,
    nombre: '',
    whatsapp: '',
    ciudad: '',
    edad: 35,
    ingreso: 0,
    lesiones: null,
    cirugia: null,
    diasBaja: 0,
    tercero: null,
    aseguradora: '',
    actaPolicial: null,
    tipoSiniestro: '',
    descripcion: '',
    documentos: [],
  };

  // ── DOM References ──
  let calcModal, stepContent, stepProgress;

  // ── Initialize ──
  document.addEventListener('DOMContentLoaded', () => {
    calcModal = document.getElementById('calcModal');
    stepContent = document.getElementById('stepContent');
    stepProgress = document.getElementById('stepProgress');

    // Floating bar visibility on scroll
    const floatingBar = document.getElementById('floatingBar');
    if (floatingBar) {
      let lastScroll = 0;
      window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > 400) {
          floatingBar.classList.add('visible');
        } else {
          floatingBar.classList.remove('visible');
        }
        lastScroll = scrollY;
      });
    }

    // FAQ toggles
    document.querySelectorAll('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-question');
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.faq-item').forEach(other => {
            if (other !== item) other.classList.remove('open');
          });
          item.classList.toggle('open');
        });
      }
    });
  });

  // ── Open Calculator ──
  window.openCalculator = function() {
    state.step = 1;
    calcModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderStep();
  };

  // ── Close Calculator ──
  window.closeCalculator = function() {
    calcModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  // ── Render Step ──
  function renderStep() {
    updateProgress();
    calcModal.scrollTop = 0;

    switch (state.step) {
      case 1: renderStep1(); break;
      case 2: renderStep2(); break;
      case 3: renderStep3(); break;
      case 4: renderResult(); break;
    }
  }

  function updateProgress() {
    if (!stepProgress) return;
    const pills = stepProgress.querySelectorAll('.step-pill');
    pills.forEach((pill, i) => {
      const n = i + 1;
      pill.className = 'step-pill';
      if (n < state.step) pill.classList.add('done');
      if (n === state.step) pill.classList.add('active');
    });
  }

  // ══════════════════════════════
  // STEP 1: Datos básicos
  // ══════════════════════════════
  function renderStep1() {
    const cfg = JV_CONFIG;
    const ciudadesOptions = cfg.ciudades.map(c =>
      `<option value="${c}"${state.ciudad === c ? ' selected' : ''}>${c}</option>`
    ).join('');

    stepContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="step-label">Paso 1 de 3</div>
        <div class="step-title">${cfg.textos.calcTitulo}</div>
        <div class="step-desc">${cfg.textos.calcDescripcion}</div>
        
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <input type="text" class="form-input" id="fNombre" 
                 placeholder="Ej: María García" value="${state.nombre}" autocomplete="name">
        </div>
        
        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input type="tel" class="form-input" id="fWhatsapp" 
                 placeholder="+54 9 11 1234-5678" value="${state.whatsapp}" autocomplete="tel">
        </div>
        
        <div class="form-group">
          <label class="form-label">Ciudad / Localidad</label>
          <select class="form-select" id="fCiudad">
            <option value="">Seleccioná tu ciudad</option>
            ${ciudadesOptions}
          </select>
        </div>
        
        <button class="btn btn-primary btn-block btn-lg mt-lg" onclick="goStep2()">
          Calcular mi indemnización <span class="hero-arrow">&rarr;</span>
        </button>
      </div>
    `;

    // Auto-focus
    setTimeout(() => {
      const el = document.getElementById('fNombre');
      if (el && !state.nombre) el.focus();
    }, 300);
  }

  window.goStep2 = function() {
    state.nombre = document.getElementById('fNombre').value.trim();
    state.whatsapp = document.getElementById('fWhatsapp').value.trim();
    state.ciudad = document.getElementById('fCiudad').value;

    // Validación
    if (!state.nombre) return shakeField('fNombre');
    if (!state.whatsapp) return shakeField('fWhatsapp');
    if (!state.ciudad) return shakeField('fCiudad');

    // AUTO-SAVE: El lead mínimo viable ya está capturado
    saveLeadPartial(1);

    state.step = 2;
    renderStep();
  };

  // ══════════════════════════════
  // STEP 2: El Calculador
  // ══════════════════════════════
  function renderStep2() {
    const asegOptions = JV_CONFIG.aseguradoras.map(a =>
      `<option value="${a}"${state.aseguradora === a ? ' selected' : ''}>${a}</option>`
    ).join('');

    const tipoOptions = JV_CONFIG.tiposSiniestro.map(t =>
      `<option value="${t}"${state.tipoSiniestro === t ? ' selected' : ''}>${t}</option>`
    ).join('');

    stepContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="step-label">Paso 2 de 3 — El calculador</div>
        <div class="step-title">Contanos sobre el siniestro</div>
        <div class="step-desc">Respondé estas preguntas para estimar tu indemnización. Cuanto más completes, más preciso será el resultado.</div>
        
        <div class="form-group">
          <label class="form-label">Tu edad</label>
          <input type="number" class="form-input" id="fEdad" 
                 min="18" max="99" value="${state.edad}" placeholder="35">
        </div>
        
        <div class="form-group">
          <label class="form-label">Ingreso mensual neto (ARS)</label>
          <input type="number" class="form-input" id="fIngreso" 
                 value="${state.ingreso || ''}" placeholder="Ej: 500000">
        </div>
        
        <div class="form-group">
          <label class="form-label">¿Hubo lesiones físicas?</label>
          <div class="toggle-group" id="tgLesiones">
            <button type="button" class="toggle-btn${state.lesiones === true ? ' active' : ''}" 
                    onclick="setToggle('lesiones', true, 'tgLesiones')">Sí</button>
            <button type="button" class="toggle-btn${state.lesiones === false ? ' active' : ''}" 
                    onclick="setToggle('lesiones', false, 'tgLesiones')">No</button>
          </div>
        </div>
        
        <div id="condLesiones" class="${state.lesiones ? '' : 'hidden'}">
          <div class="form-group">
            <label class="form-label">¿Requirió cirugía o internación?</label>
            <div class="toggle-group" id="tgCirugia">
              <button type="button" class="toggle-btn${state.cirugia === true ? ' active' : ''}" 
                      onclick="setToggle('cirugia', true, 'tgCirugia')">Sí</button>
              <button type="button" class="toggle-btn${state.cirugia === false ? ' active' : ''}" 
                      onclick="setToggle('cirugia', false, 'tgCirugia')">No</button>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Días de baja laboral / reposo</label>
            <input type="number" class="form-input" id="fDias" 
                   min="0" max="365" value="${state.diasBaja || ''}" placeholder="Ej: 30">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">¿Tenés datos del tercero responsable?</label>
          <div class="toggle-group" id="tgTercero">
            <button type="button" class="toggle-btn${state.tercero === true ? ' active' : ''}" 
                    onclick="setToggle('tercero', true, 'tgTercero')">Sí, tengo datos</button>
            <button type="button" class="toggle-btn${state.tercero === false ? ' active' : ''}" 
                    onclick="setToggle('tercero', false, 'tgTercero')">No</button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Aseguradora del tercero</label>
          <select class="form-select" id="fAseguradora">
            <option value="">Seleccioná la aseguradora</option>
            ${asegOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">¿Se labró acta policial o denuncia?</label>
          <div class="toggle-group" id="tgActa">
            <button type="button" class="toggle-btn${state.actaPolicial === true ? ' active' : ''}" 
                    onclick="setToggle('actaPolicial', true, 'tgActa')">Sí</button>
            <button type="button" class="toggle-btn${state.actaPolicial === false ? ' active' : ''}" 
                    onclick="setToggle('actaPolicial', false, 'tgActa')">No</button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Tipo de siniestro</label>
          <select class="form-select" id="fTipo">
            <option value="">Seleccioná el tipo</option>
            ${tipoOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Breve descripción del caso</label>
          <textarea class="form-textarea" id="fDescripcion" 
                    placeholder="Contanos qué pasó. Cuanto más detalle, mejor podemos evaluar tu caso. (máx. 500 caracteres)" 
                    maxlength="500">${state.descripcion}</textarea>
        </div>
        
        <button class="btn btn-primary btn-block btn-lg mt-lg" onclick="goStep3()">
          Continuar <span class="hero-arrow">&rarr;</span>
        </button>
        <button class="btn btn-outline btn-block mt-sm" onclick="goBack(1)">
          &larr; Volver
        </button>
      </div>
    `;
  }

  // ── Toggle Handler ──
  window.setToggle = function(field, value, groupId) {
    state[field] = value;
    const group = document.getElementById(groupId);
    if (group) {
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      // Activate the clicked one
      const buttons = group.querySelectorAll('.toggle-btn');
      if (value === true && buttons[0]) buttons[0].classList.add('active');
      if (value === false && buttons[1]) buttons[1].classList.add('active');
    }

    // Conditional: show/hide lesiones section
    if (field === 'lesiones') {
      const cond = document.getElementById('condLesiones');
      if (cond) {
        cond.classList.toggle('hidden', !value);
        if (!value) {
          state.cirugia = null;
          state.diasBaja = 0;
        }
      }
    }
  };

  window.goStep3 = function() {
    state.edad = parseInt(document.getElementById('fEdad').value) || 35;
    state.ingreso = parseFloat(document.getElementById('fIngreso').value) || 0;
    const diasEl = document.getElementById('fDias');
    state.diasBaja = diasEl ? parseInt(diasEl.value) || 0 : 0;
    state.aseguradora = document.getElementById('fAseguradora').value;
    state.tipoSiniestro = document.getElementById('fTipo').value;
    state.descripcion = document.getElementById('fDescripcion').value;

    // AUTO-SAVE: datos del calculador
    saveLeadPartial(2);

    state.step = 3;
    renderStep();
  };

  // ══════════════════════════════
  // STEP 3: Documentación
  // ══════════════════════════════
  function renderStep3() {
    const docsHTML = state.documentos.map(d =>
      `<span class="doc-chip added">${d} ✓</span>`
    ).join('');

    stepContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="step-label">Paso 3 de 3 — Documentación (opcional)</div>
        <div class="step-title">Subí evidencia del siniestro</div>
        <div class="step-desc">Cuanta más documentación aportes, más preciso será el estimado y mayor será la prioridad de tu caso. Este paso es opcional.</div>
        
        <div class="upload-area" id="uploadArea">
          <div class="upload-icon">📎</div>
          <div class="upload-text">Tocá para subir fotos o documentos</div>
          <div class="upload-hint">JPG, PNG, PDF — máx. 10 MB por archivo</div>
          <input type="file" id="fileInput" multiple accept="image/*,.pdf" 
                 style="display:none" onchange="handleFiles(this)">
        </div>
        
        <div class="doc-chips mt-sm" id="docsList">${docsHTML}</div>
        
        <div style="margin-top:16px; font-size:13px; color:var(--jv-gray-500); margin-bottom:8px;">
          O seleccioná qué documentos tenés:
        </div>
        <div class="doc-chips" id="docSuggestions">
          <button class="doc-chip" onclick="addDocument('Foto del siniestro')">+ Foto del siniestro</button>
          <button class="doc-chip" onclick="addDocument('Acta policial')">+ Acta policial</button>
          <button class="doc-chip" onclick="addDocument('Certificado médico')">+ Certificado médico</button>
          <button class="doc-chip" onclick="addDocument('Recibo de sueldo')">+ Recibo de sueldo</button>
          <button class="doc-chip" onclick="addDocument('Póliza del tercero')">+ Póliza del tercero</button>
          <button class="doc-chip" onclick="addDocument('Fotos de lesiones')">+ Fotos de lesiones</button>
        </div>
        
        <button class="btn btn-primary btn-block btn-lg mt-xl" onclick="goResult()">
          Ver mi resultado
        </button>
        <button class="btn btn-outline btn-block mt-sm" onclick="goResult()">
          Omitir y ver resultado
        </button>
        <button class="btn btn-outline btn-block mt-sm" onclick="goBack(2)">
          &larr; Volver
        </button>
      </div>
    `;

    // Upload area click handler
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.addEventListener('click', () => {
        document.getElementById('fileInput').click();
      });
    }
  }

  window.handleFiles = async function(input) {
    const files = input.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        alert('El archivo ' + file.name + ' es demasiado grande (máx 15 MB)');
        continue;
      }
      
      if (!state.documentos.includes(file.name)) {
        state.documentos.push(file.name);
      }
      
      // Subir a Supabase si ya tenemos un lead guardado
      if (state._leadId) {
        try {
          await JV_API.uploadLeadDocument(
            'a0000000-0000-0000-0000-000000000001', // tenant_id
            state._leadId,
            file
          );
          console.log('[JusticiaVial] Documento subido:', file.name);
        } catch (err) {
          console.error('[JusticiaVial] Error subiendo documento:', err);
        }
      }
    }
    renderStep3DocsList();
  };

  window.addDocument = function(name) {
    if (!state.documentos.includes(name)) {
      state.documentos.push(name);
      renderStep3DocsList();
    }
  };

  function renderStep3DocsList() {
    const el = document.getElementById('docsList');
    if (el) {
      el.innerHTML = state.documentos.map(d =>
        `<span class="doc-chip added">${d} ✓</span>`
      ).join('');
    }
  }

  window.goResult = function() {
    saveLeadPartial(3);
    state.step = 4;
    renderStep();
  };

  // ══════════════════════════════
  // STEP 4: Resultado
  // ══════════════════════════════
  function renderResult() {
    const resultado = JV_ENGINE.calcularIndemnizacion(state);
    const scoring = JV_ENGINE.calcularScore(state);
    const waURL = JV_ENGINE.generarWhatsAppURL('leadCalculador', {
      nombre: state.nombre,
      montoMin: resultado.minimo,
      montoMax: resultado.maximo,
      score: scoring.total,
      ciudad: state.ciudad,
    });

    const scoreClass = JV_ENGINE.getScoreClass(scoring.nivel);
    const scoreLabel = JV_ENGINE.getScoreLabel(scoring.nivel);

    // Build breakdown rows
    const items = [
      { label: 'Incapacidad sobreviniente', value: resultado.desglose.incapacidad },
      { label: 'Lucro cesante', value: resultado.desglose.lucroCesante },
      { label: 'Daño moral', value: resultado.desglose.danoMoral },
      { label: 'Gastos médicos', value: resultado.desglose.gastosMedicos },
    ];
    if (resultado.desglose.danoEstetico > 0) {
      items.push({ label: 'Daño estético', value: resultado.desglose.danoEstetico });
    }

    const breakdownHTML = items.map(item => `
      <div class="result-row">
        <span class="result-row-label">${item.label}</span>
        <span class="result-row-value">${JV_ENGINE.formatARS(item.value)}</span>
      </div>
    `).join('');

    stepContent.innerHTML = `
      <div class="result-screen animate-fade-in-up">
        <div class="step-label">Resultado del cálculo</div>
        <div class="step-title">Tu indemnización estimada</div>
        
        <div class="result-amount">
          ${JV_ENGINE.formatARS(resultado.minimo)} — ${JV_ENGINE.formatARS(resultado.maximo)}
        </div>
        <div class="result-range">Rango estimado según jurisprudencia argentina</div>
        
        <div style="margin: 16px 0;">
          <span class="result-score badge ${scoreClass}">
            Score: ${scoring.total}/100 — ${scoreLabel}
          </span>
        </div>
        
        <div class="result-breakdown">
          <div class="result-breakdown-title">Desglose estimado</div>
          ${breakdownHTML}
        </div>
        
        <a href="${waURL}" target="_blank" rel="noopener"
           class="btn btn-whatsapp btn-block btn-lg mt-xl">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.243l-.307-.184-2.87.852.852-2.87-.184-.307A8 8 0 1112 20z"/>
          </svg>
          Hablar con un abogado por WhatsApp
        </a>
        
        <button class="btn btn-outline btn-block mt-sm" onclick="requestCallback()">
          📞 Quiero que me llamen
        </button>
        
        <button class="btn btn-outline btn-block mt-sm" onclick="resetCalculator()">
          &larr; Empezar de nuevo
        </button>
        
        <div class="result-disclaimer mt-lg">
          ${JV_CONFIG.textos.disclaimer}
        </div>
      </div>
    `;
  }

  window.requestCallback = function() {
    alert('¡Gracias! Un abogado del ' + JV_CONFIG.estudio.nombreCorto + ' te va a llamar dentro de las próximas horas.');
  };

  window.resetCalculator = function() {
    state.step = 1;
    state.documentos = [];
    renderStep();
  };

  // ── Navigation ──
  window.goBack = function(toStep) {
    // Save current inputs before going back
    if (state.step === 2) {
      const edadEl = document.getElementById('fEdad');
      if (edadEl) state.edad = parseInt(edadEl.value) || 35;
      const ingresoEl = document.getElementById('fIngreso');
      if (ingresoEl) state.ingreso = parseFloat(ingresoEl.value) || 0;
      const diasEl = document.getElementById('fDias');
      if (diasEl) state.diasBaja = parseInt(diasEl.value) || 0;
      const asegEl = document.getElementById('fAseguradora');
      if (asegEl) state.aseguradora = asegEl.value;
      const tipoEl = document.getElementById('fTipo');
      if (tipoEl) state.tipoSiniestro = tipoEl.value;
      const descEl = document.getElementById('fDescripcion');
      if (descEl) state.descripcion = descEl.value;
    }
    state.step = toStep;
    renderStep();
  };

  // ── Auto-save (placeholder for real API integration) ──
  async function saveLeadPartial(stepCompleted) {
    try {
      const result = await JV_API.saveLead(
        JV_CONFIG.estudio.slug,
        state,
        stepCompleted
      );
      
      if (result.data) {
        state._leadId = result.data.id;
        console.log('[JusticiaVial] Lead guardado en Supabase (paso ' + stepCompleted + '):', result.data.id);
      } else {
        console.error('[JusticiaVial] Error guardando lead:', result.error);
      }
    } catch (err) {
      console.error('[JusticiaVial] Error de red:', err);
      // Fallback: guardar en localStorage
      try {
        localStorage.setItem('jv_lead_draft', JSON.stringify({
          ...state, stepCompleted, timestamp: new Date().toISOString()
        }));
      } catch (e) { /* silently fail */ }
    }
  }

  // ── Validation shake effect ──
  function shakeField(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = 'var(--jv-danger)';
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.4s ease';
    el.focus();
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.animation = '';
    }, 1000);
  }

  // Add shake keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);

})();
