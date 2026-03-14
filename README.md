# JusticiaVial — Plataforma de Captación y Seguimiento de Litigios

## Estructura de archivos

```
justiciavial/
├── index.html          ← Landing page pública (calculador)
├── dashboard.html      ← Panel de administración (backoffice)
├── css/
│   ├── main.css        ← Design system y componentes compartidos
│   ├── landing.css     ← Estilos de la landing page
│   └── dashboard.css   ← Estilos del dashboard
├── js/
│   ├── config.js       ← ⚡ CONFIGURACIÓN EDITABLE (fórmulas, keywords, textos)
│   ├── engine.js       ← Motor de cálculo (Vuoto) y scoring
│   ├── landing.js      ← Controlador de la landing page
│   └── dashboard.js    ← Controlador del dashboard
└── README.md           ← Este archivo
```

## Cómo desplegar

### Opción 1: Hosting estático (más simple)
Subí toda la carpeta a cualquier hosting estático:
- **Netlify**: Arrastrá la carpeta al dashboard de Netlify
- **Vercel**: `vercel --prod` desde la carpeta
- **GitHub Pages**: Pusheá a un repo y activá Pages
- **Firebase Hosting**: `firebase deploy`

### Opción 2: Servidor web
Copiá los archivos a la carpeta pública de tu servidor (nginx, Apache, etc.)

## Cómo personalizar

### 1. Datos del estudio
Editá `js/config.js` → sección `estudio`:
```javascript
estudio: {
  nombre: "Tu Estudio & Asociados",
  whatsapp: "549XXXXXXXXXX",  // Sin + ni espacios
  direccion: "Tu dirección",
  matricula: "Tu matrícula",
}
```

### 2. Fórmula de indemnización
Editá `js/config.js` → sección `formula`:
- `coeficienteVuoto`: Coeficiente principal (default: 1.65)
- `porcentajeDanoMoral`: % de daño moral (default: 0.30)
- `factorMinimo` / `factorMaximo`: Rango del resultado
- `gastosMedicosCirugia` / `gastosMedicosLeve`: Montos fijos

### 3. Keywords NLP
Editá `js/config.js` → sección `keywords`:
Cada keyword tiene: `palabra`, `categoria`, `impacto` (en puntos de score)

### 4. Mensajes de WhatsApp
Editá `js/config.js` → sección `mensajes`:
Variables disponibles: `{nombre}`, `{monto_min}`, `{monto_max}`, `{score}`, `{ciudad}`

### 5. Textos de la landing
Editá `js/config.js` → sección `textos` o directamente en `index.html`

### 6. Colores
Editá `css/main.css` → variables CSS en `:root`

## URLs
- Landing pública: `tudominio.com/` o `tudominio.com/index.html`
- Dashboard: `tudominio.com/dashboard.html`

## Siguiente paso: Backend
Para conectar con un backend real (Supabase/PostgreSQL):
1. Reemplazar los datos de ejemplo en `dashboard.js` con llamadas a API
2. Implementar el auto-save de `landing.js` con fetch() a tu API
3. Agregar autenticación al dashboard con Supabase Auth

## Stack recomendado para producción
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + tRPC
- **Base de datos**: PostgreSQL (Supabase) con RLS
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **IA**: Anthropic Claude API
- **WhatsApp**: Twilio Business API
- **Firma digital**: DocuSign / SignNow

---
JusticiaVial v1.0 — Marzo 2026
