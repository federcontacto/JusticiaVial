/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Motor de Cálculo y Scoring
   ══════════════════════════════════════════════ */

const JV_ENGINE = {

  // ── Formatear moneda ARS ──
  formatARS(amount) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(amount));
  },

  // ── Formatear número con separador de miles ──
  formatNum(n) {
    return new Intl.NumberFormat('es-AR').format(Math.round(n));
  },

  // ══════════════════════════════════════════
  // CALCULADOR DE INDEMNIZACIÓN
  // ══════════════════════════════════════════

  /**
   * Calcula la indemnización estimada
   * @param {Object} datos - Datos del formulario
   * @returns {Object} Resultado con desglose y rangos
   */
  calcularIndemnizacion(datos) {
    const cfg = JV_CONFIG.formula;
    
    // Determinar porcentaje de incapacidad
    let incapacidad = 0;
    if (!datos.lesiones) {
      incapacidad = cfg.tablaIncapacidad.sinLesiones;
    } else if (datos.cirugia) {
      incapacidad = cfg.tablaIncapacidad.grave;
    } else {
      incapacidad = cfg.tablaIncapacidad.leve;
    }
    
    const edad = datos.edad || 35;
    const ingreso = datos.ingreso || 0;
    const vidaUtil = cfg.edadJubilacion - edad;
    const coef = cfg.coeficienteVuoto;
    
    // 1. Incapacidad Sobreviniente (Fórmula Vuoto)
    let vuoto = 0;
    if (vidaUtil > 0 && incapacidad > 0) {
      vuoto = (ingreso * coef * vidaUtil * incapacidad) / (vidaUtil + coef);
    }
    
    // 2. Lucro Cesante
    const diasBaja = datos.diasBaja || 0;
    const ingresoDiario = ingreso / 30;
    const lucroCesante = ingresoDiario * diasBaja * cfg.coeficienteLucroCesante;
    
    // 3. Daño Moral
    const danoMoral = vuoto * cfg.porcentajeDanoMoral;
    
    // 4. Gastos Médicos
    let gastosMedicos = 0;
    if (datos.cirugia) {
      gastosMedicos = cfg.gastosMedicosCirugia;
    } else if (datos.lesiones) {
      gastosMedicos = cfg.gastosMedicosLeve;
    }
    
    // 5. Daño Estético (solo si hubo cirugía)
    const danoEstetico = datos.cirugia ? vuoto * cfg.porcentajeDanoEstetico : 0;
    
    // Total
    const total = vuoto + lucroCesante + danoMoral + gastosMedicos + danoEstetico;
    
    // Rangos
    const minimo = total * cfg.factorMinimo;
    const maximo = total * cfg.factorMaximo;
    
    return {
      desglose: {
        incapacidad: Math.round(vuoto),
        lucroCesante: Math.round(lucroCesante),
        danoMoral: Math.round(danoMoral),
        gastosMedicos: Math.round(gastosMedicos),
        danoEstetico: Math.round(danoEstetico),
      },
      total: Math.round(total),
      minimo: Math.round(minimo),
      maximo: Math.round(maximo),
      porcentajeIncapacidad: Math.round(incapacidad * 100),
    };
  },

  // ══════════════════════════════════════════
  // SCORING DE LEADS
  // ══════════════════════════════════════════

  /**
   * Calcula el score total del lead
   * @param {Object} datos - Datos del formulario
   * @returns {Object} Score con desglose
   */
  calcularScore(datos) {
    const cfg = JV_CONFIG.scoring;
    const desglose = {};
    let total = 0;
    
    // 1. Lesiones
    if (datos.lesiones) {
      desglose.lesiones = cfg.lesionesGraves;
      total += cfg.lesionesGraves;
      
      if (datos.cirugia) {
        desglose.cirugia = cfg.cirugia;
        total += cfg.cirugia;
      }
    }
    
    // 2. Aseguradora identificada
    if (datos.aseguradora && datos.aseguradora !== "No sé / No identificada") {
      desglose.aseguradora = cfg.aseguradoraIdentificada;
      total += cfg.aseguradoraIdentificada;
    }
    
    // 3. Tercero identificado
    if (datos.tercero) {
      desglose.tercero = cfg.terceroIdentificado;
      total += cfg.terceroIdentificado;
    }
    
    // 4. Acta policial
    if (datos.actaPolicial) {
      desglose.actaPolicial = cfg.actaPolicial;
      total += cfg.actaPolicial;
    }
    
    // 5. Ingreso alto
    if ((datos.ingreso || 0) > cfg.umbralIngresoAlto) {
      desglose.ingresoAlto = cfg.ingresoAlto;
      total += cfg.ingresoAlto;
    }
    
    // 6. Edad productiva
    const edad = datos.edad || 0;
    if (edad >= 25 && edad <= 55) {
      desglose.edadProductiva = cfg.edadProductiva;
      total += cfg.edadProductiva;
    }
    
    // 7. Documentos adjuntos
    const numDocs = (datos.documentos || []).length;
    if (numDocs > 0) {
      const puntosDoc = Math.min(numDocs * cfg.puntosPorDocumento, cfg.maxPuntosDocumentos);
      desglose.documentos = puntosDoc;
      total += puntosDoc;
    }
    
    // 8. Análisis NLP de keywords
    const nlpScore = this.analizarNLP(datos.descripcion || "");
    if (nlpScore.puntos !== 0) {
      desglose.nlp = nlpScore.puntos;
      total += nlpScore.puntos;
    }
    
    // Clamp score 0-100
    total = Math.max(0, Math.min(100, total));
    
    // Clasificación
    let nivel;
    if (total >= cfg.umbrales.alto) {
      nivel = "alto";
    } else if (total >= cfg.umbrales.medio) {
      nivel = "medio";
    } else {
      nivel = "bajo";
    }
    
    return {
      total,
      nivel,
      desglose,
      nlpDetalle: this.analizarNLP(datos.descripcion || ""),
    };
  },

  // ══════════════════════════════════════════
  // ANÁLISIS NLP
  // ══════════════════════════════════════════

  /**
   * Analiza texto buscando keywords del diccionario
   * @param {string} texto - Descripción del caso
   * @returns {Object} Resultado del análisis NLP
   */
  analizarNLP(texto) {
    if (!texto || texto.trim().length === 0) {
      return { puntos: 0, matches: [], categorias: {} };
    }
    
    const textoLower = texto.toLowerCase();
    const matches = [];
    const categorias = {};
    let puntos = 0;
    
    JV_CONFIG.keywords.forEach(kw => {
      if (textoLower.includes(kw.palabra.toLowerCase())) {
        matches.push(kw);
        puntos += kw.impacto;
        
        if (!categorias[kw.categoria]) {
          categorias[kw.categoria] = [];
        }
        categorias[kw.categoria].push(kw.palabra);
      }
    });
    
    return { puntos, matches, categorias };
  },

  // ══════════════════════════════════════════
  // GENERADOR DE MENSAJE WHATSAPP
  // ══════════════════════════════════════════

  /**
   * Genera URL de WhatsApp con mensaje pre-armado
   * @param {string} template - Key del template en config
   * @param {Object} datos - Datos para reemplazar variables
   * @returns {string} URL de WhatsApp
   */
  generarWhatsAppURL(template, datos) {
    let mensaje = JV_CONFIG.mensajes[template] || JV_CONFIG.mensajes.leadCalculador;
    
    // Reemplazar variables
    const vars = {
      '{nombre}': datos.nombre || '',
      '{monto_min}': this.formatARS(datos.montoMin || 0),
      '{monto_max}': this.formatARS(datos.montoMax || 0),
      '{score}': datos.score || 0,
      '{ciudad}': datos.ciudad || '',
    };
    
    Object.entries(vars).forEach(([key, value]) => {
      mensaje = mensaje.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    const encoded = encodeURIComponent(mensaje);
    return `https://wa.me/${JV_CONFIG.estudio.whatsapp}?text=${encoded}`;
  },

  // ══════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════

  /**
   * Obtiene el label en español del nivel de score
   */
  getScoreLabel(nivel) {
    const labels = {
      alto: "Alto — Caso prioritario",
      medio: "Medio — Solicitar más info",
      bajo: "Bajo — Evaluar viabilidad"
    };
    return labels[nivel] || nivel;
  },

  /**
   * Obtiene la clase CSS del nivel
   */
  getScoreClass(nivel) {
    return `badge-${nivel}`;
  },

  /**
   * Valida formato de WhatsApp argentino
   */
  validarWhatsApp(numero) {
    // Acepta: +54 9 11 1234-5678, 5491112345678, etc.
    const limpio = numero.replace(/[\s\-\(\)]/g, '');
    return /^(\+?54)?9?\d{10,11}$/.test(limpio);
  },

  /**
   * Valida que un campo no esté vacío
   */
  validarRequerido(valor) {
    return valor !== null && valor !== undefined && String(valor).trim().length > 0;
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.JV_ENGINE = JV_ENGINE;
}
