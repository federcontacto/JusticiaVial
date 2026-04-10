/* ══════════════════════════════════════════════
   JUSTICIAVIAL — Configuración Editable
   ══════════════════════════════════════════════
   
   Este archivo contiene TODA la configuración
   editable del sistema. Para modificar cálculos,
   keywords, textos o parámetros, editá solo 
   este archivo.
   
   ══════════════════════════════════════════════ */

    }
  },

  // ── Fórmula de Indemnización ──
  formula: {
    // Coeficiente principal (Vuoto)
    coeficienteVuoto: 1.65,
    
    // Edad de jubilación (vida útil laboral)
    edadJubilacion: 65,
    
    // Porcentaje de daño moral sobre el patrimonial
    porcentajeDanoMoral: 0.30,
    
    // Coeficiente multiplicador del lucro cesante
    coeficienteLucroCesante: 1.10,
    
    // Porcentaje de daño estético (si hubo cirugía)
    porcentajeDanoEstetico: 0.08,
    
    // Gastos médicos fijos estimados (ARS)
    gastosMedicosCirugia: 350000,
    gastosMedicosLeve: 120000,
    
    // Factor de rango Min/Max
    factorMinimo: 0.70,
    factorMaximo: 1.40,
    
    // Tabla de incapacidad estimada por tipo de lesión
    tablaIncapacidad: {
      sinLesiones: 0,
      leve: 0.08,       // Contusiones, esguinces
      moderada: 0.15,    // Fractura simple
      grave: 0.30,       // Fractura compleja / cirugía
      muyGrave: 0.50,    // Lesión medular / amputación
      fallecimiento: 1.0
    }
  },

  // ── Scoring de Leads ──
  scoring: {
    // Puntos por factor
    lesionesGraves: 15,
    cirugia: 15,
    aseguradoraIdentificada: 20,
    terceroIdentificado: 15,
    actaPolicial: 15,
    ingresoAlto: 10,         // Ingreso > umbralIngresoAlto
    edadProductiva: 5,       // Edad entre 25-55
    
    // Umbral de ingreso alto (ARS)
    umbralIngresoAlto: 400000,
    
    // Puntos por documento adjunto
    puntosPorDocumento: 5,
    maxPuntosDocumentos: 20,
    
    // Umbrales de clasificación
    umbrales: {
      alto: 75,    // >= 75: ALTO (verde)
      medio: 40    // >= 40: MEDIO (amarillo), < 40: BAJO (rojo)
    }
  },

  // ── Diccionario NLP de Keywords ──
  keywords: [
    // Gravedad Médica
    { palabra: "fractura", categoria: "gravedad", impacto: 20 },
    { palabra: "hospital", categoria: "gravedad", impacto: 15 },
    { palabra: "cirugía", categoria: "gravedad", impacto: 25 },
    { palabra: "cirugia", categoria: "gravedad", impacto: 25 },
    { palabra: "internación", categoria: "gravedad", impacto: 20 },
    { palabra: "internacion", categoria: "gravedad", impacto: 20 },
    { palabra: "coma", categoria: "gravedad", impacto: 25 },
    { palabra: "amputación", categoria: "gravedad", impacto: 25 },
    { palabra: "amputacion", categoria: "gravedad", impacto: 25 },
    { palabra: "rehabilitación", categoria: "gravedad", impacto: 15 },
    { palabra: "prótesis", categoria: "gravedad", impacto: 20 },
    { palabra: "tornillos", categoria: "gravedad", impacto: 15 },
    { palabra: "placas", categoria: "gravedad", impacto: 15 },
    { palabra: "yeso", categoria: "gravedad", impacto: 10 },
    { palabra: "traumatismo", categoria: "gravedad", impacto: 18 },
    
    // Incapacidad
    { palabra: "incapacidad", categoria: "incapacidad", impacto: 20 },
    { palabra: "no puedo trabajar", categoria: "incapacidad", impacto: 18 },
    { palabra: "licencia médica", categoria: "incapacidad", impacto: 12 },
    { palabra: "baja laboral", categoria: "incapacidad", impacto: 12 },
    { palabra: "reposo", categoria: "incapacidad", impacto: 8 },
    { palabra: "ART", categoria: "incapacidad", impacto: 10 },
    
    // Fallecimiento
    { palabra: "fallecimiento", categoria: "fatal", impacto: 30 },
    { palabra: "muerte", categoria: "fatal", impacto: 30 },
    { palabra: "falleció", categoria: "fatal", impacto: 30 },
    { palabra: "fallecio", categoria: "fatal", impacto: 30 },
    { palabra: "murió", categoria: "fatal", impacto: 30 },
    { palabra: "deceso", categoria: "fatal", impacto: 30 },
    { palabra: "víctima fatal", categoria: "fatal", impacto: 30 },
    
    // Agravantes
    { palabra: "fuga", categoria: "agravante", impacto: 15 },
    { palabra: "se dio a la fuga", categoria: "agravante", impacto: 15 },
    { palabra: "alcoholemia", categoria: "agravante", impacto: 15 },
    { palabra: "borracho", categoria: "agravante", impacto: 12 },
    { palabra: "droga", categoria: "agravante", impacto: 12 },
    { palabra: "exceso de velocidad", categoria: "agravante", impacto: 10 },
    { palabra: "semáforo en rojo", categoria: "agravante", impacto: 12 },
    { palabra: "contramano", categoria: "agravante", impacto: 12 },
    
    // Evidencia
    { palabra: "testigos", categoria: "evidencia", impacto: 10 },
    { palabra: "cámara", categoria: "evidencia", impacto: 10 },
    { palabra: "filmación", categoria: "evidencia", impacto: 10 },
    { palabra: "peritaje", categoria: "evidencia", impacto: 8 },
    { palabra: "denuncia", categoria: "evidencia", impacto: 5 },
    
    // Debilidad
    { palabra: "no vi", categoria: "debilidad", impacto: -10 },
    { palabra: "no recuerdo", categoria: "debilidad", impacto: -5 },
    { palabra: "culpa mía", categoria: "debilidad", impacto: -15 },
    { palabra: "iba distraído", categoria: "debilidad", impacto: -10 },
    { palabra: "iba distraída", categoria: "debilidad", impacto: -10 },
  ],

  // ── Mensajes de WhatsApp ──
  mensajes: {
    // Mensaje que envía el lead desde el calculador
    leadCalculador: "Hola, usé el calculador de indemnización y mi estimado es de {monto_min} a {monto_max}. Me llamo {nombre} y quiero asesoría para mi caso de siniestro vial.",
    
    // Mensaje de bienvenida del estudio al lead
    bienvenida: "Hola {nombre}, soy del Estudio Rodríguez. Recibimos tu consulta sobre tu siniestro con un estimado de {monto_min} a {monto_max}. ¿Podemos agendar una llamada para evaluar tu caso?",
    
    // Mensaje de seguimiento
    seguimiento: "Hola {nombre}, queríamos saber si pudiste revisar la información que te enviamos sobre tu caso. Estamos a disposición para avanzar con tu reclamo.",
  },

  // ── Textos de la Landing Page ──
  textos: {
    heroTitulo: 'NADA QUE VER .<em>No lo que la aseguradora quiere pagarte...</em>',
    heroSubtitulo: "Recibí un estimado inmediato de tu indemnización basado en jurisprudencia argentina. Sin compromiso, sin costo, en 2 minutos.",
    heroCta: "Calcular mi indemnización",
    
    calcTitulo: "Calculá gratis tu indemnización",
    calcDescripcion: "Completá tus datos para recibir un estimado inmediato. Tu información es confidencial.",
    
    disclaimer: "Este cálculo es orientativo y no constituye asesoramiento legal. Los montos finales dependen de las circunstancias particulares de cada caso y la jurisprudencia aplicable.",
    
    ctaFinal: "No dejes que la aseguradora decida por vos",
    ctaFinalSub: "Cada día que pasa sin reclamar es plata que perdés. Calculá tu indemnización ahora y tomá una decisión informada.",
  },

  // ── Catálogos ──
  ciudades: [
    "CABA", "La Plata", "Avellaneda", "Quilmes", "Morón", 
    "San Isidro", "Tigre", "Lomas de Zamora", "La Matanza",
    "Mar del Plata", "Bahía Blanca", "San Nicolás",
    "Paraná", "Concordia", "Gualeguaychú",
    "Posadas", "Oberá", "Eldorado",
    "Otra"
  ],

  aseguradoras: [
    "La Segunda", "Sancor Seguros", "Federación Patronal", 
    "Mapfre", "Zurich", "Allianz", "San Cristóbal", 
    "Rivadavia Seguros", "La Holando", "Meridional",
    "La Caja", "BBVA Seguros", "HDI Seguros",
    "Provincia Seguros", "Orbis Seguros",
    "No sé / No identificada"
  ],

  tiposSiniestro: [
    "Colisión vehicular", "Atropello de peatón", 
    "Colisión con moto", "Vuelco", "Choque en cadena",
    "Siniestro en transporte público", "Otro"
  ]
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.JV_CONFIG = JV_CONFIG;
}
