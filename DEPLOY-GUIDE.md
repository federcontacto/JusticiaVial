# GUÍA PASO A PASO: Desplegar JusticiaVial en Producción

## Resumen
Esta guía te lleva desde cero hasta tener el sitio funcionando con base de datos real. Tiempo estimado: 45-60 minutos.

---

## PASO 1 — Crear proyecto en Supabase (5 min)

1. Ir a **https://supabase.com** → "Start your project"
2. Crear cuenta (o login con GitHub)
3. Click **"New Project"**
4. Completar:
   - **Name**: `justiciavial`
   - **Database Password**: Anotala, la vas a necesitar
   - **Region**: South America (São Paulo) — la más cercana a Argentina
5. Esperar ~2 minutos a que se cree
6. Una vez creado, ir a **Settings → API** y copiar estos 2 valores:

```
Project URL:     https://xxxxx.supabase.co     ← COPIAR
anon public key: eyJhbGciOiJI...               ← COPIAR
```

Guardalos, los vas a usar en el Paso 4.

---

## PASO 2 — Crear la base de datos (3 min)

1. En el Dashboard de Supabase, ir a **SQL Editor** (ícono de terminal en el sidebar)
2. Click **"New query"**
3. **Pegar TODO el contenido del archivo `supabase-schema.sql`**
4. Click **"Run"** (botón verde)
5. Deberías ver: `Success. No rows returned` (es normal)

### Verificar que funcionó:
1. Ir a **Table Editor** en el sidebar
2. Deberías ver estas 10 tablas:
   - `tenants` (1 registro: Estudio Rodríguez)
   - `users` (vacía)
   - `insurers` (18 aseguradoras)
   - `leads` (vacía)
   - `cases` (vacía)
   - `documents` (vacía)
   - `nlp_keywords` (25 keywords)
   - `notifications` (vacía)
   - `audit_log` (vacía)
   - `case_events` (vacía)

Si ves las 10 tablas, la base de datos está lista.

---

## PASO 3 — Crear el primer usuario admin (3 min)

1. En Supabase, ir a **Authentication → Users**
2. Click **"Add user"** → **"Create new user"**
3. Completar:
   - **Email**: tu email real
   - **Password**: password seguro
   - **Auto Confirm User**: ✅ activar
4. Click **"Create user"**
5. Copiar el **User UID** que aparece (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

6. Ir a **SQL Editor** y correr esto (reemplazando los valores):

```sql
-- REEMPLAZAR los valores con tus datos reales
INSERT INTO users (
  tenant_id, 
  auth_id, 
  email, 
  full_name, 
  role
) VALUES (
  'a0000000-0000-0000-0000-000000000001',  -- ID del tenant ejemplo
  'PEGAR-EL-USER-UID-AQUI',                -- El UID que copiaste
  'tu@email.com',                           -- Tu email
  'Dr. Tu Nombre',                          -- Tu nombre
  'admin'                                   -- Rol admin
);
```

7. Click **"Run"**

---

## PASO 4 — Conectar el sitio con Supabase (5 min)

### 4.1 Agregar la librería de Supabase

Abrir **`index.html`** y agregar esta línea ANTES del tag `<script src="js/config.js">`:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Hacer lo mismo en **`dashboard.html`**, y agregar también el script de `api.js`:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Antes de dashboard.js, agregar: -->
<script src="js/api.js"></script>
```

### 4.2 Configurar las credenciales

Abrir **`js/api.js`** y reemplazar las dos primeras variables:

```javascript
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';    // ← Pegar tu Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJI...tu-key-aqui';    // ← Pegar tu anon key
```

### 4.3 Configurar el slug del tenant

En **`js/config.js`**, verificar que el slug coincida:

```javascript
estudio: {
  slug: "rodriguez",  // Debe coincidir con el slug en la tabla tenants
  // ...
}
```

---

## PASO 5 — Conectar el auto-save de leads (10 min)

Abrir **`js/landing.js`** y buscar la función `saveLeadPartial`. Reemplazarla con:

```javascript
async function saveLeadPartial(stepCompleted) {
  try {
    const result = await JV_API.saveLead(
      JV_CONFIG.estudio.slug,
      state,
      stepCompleted
    );
    
    if (result.data) {
      // Guardar el ID del lead para updates posteriores
      state._leadId = result.data.id;
      console.log('[JusticiaVial] Lead guardado:', result.data.id);
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
```

### 5.1 Conectar la subida de archivos

En la misma función `handleFiles` de `landing.js`, reemplazar con:

```javascript
window.handleFiles = async function(input) {
  const files = input.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 15 * 1024 * 1024) {
      alert('El archivo ' + file.name + ' es demasiado grande (máx 15 MB)');
      continue;
    }
    
    state.documentos.push(file.name);
    
    // Subir a Supabase si tenemos lead_id
    if (state._leadId) {
      const tenantId = 'a0000000-0000-0000-0000-000000000001'; // Tu tenant_id
      await JV_API.uploadLeadDocument(tenantId, state._leadId, file);
    }
  }
  renderStep3DocsList();
};
```

---

## PASO 6 — Conectar el dashboard con datos reales (15 min)

Abrir **`js/dashboard.js`** y hacer estos cambios:

### 6.1 Reemplazar datos hardcodeados por llamadas API

Al inicio del archivo, después de `'use strict';`, agregar:

```javascript
let TENANT = null;
let CURRENT_USER = null;

async function initDashboard() {
  // Verificar sesión
  const session = await JV_API.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  
  // Obtener datos del usuario
  CURRENT_USER = await JV_API.getCurrentUser();
  if (!CURRENT_USER) {
    window.location.href = 'login.html';
    return;
  }
  
  TENANT = CURRENT_USER.tenants;
  
  // Actualizar UI con nombre del estudio
  document.querySelector('.dash-brand-name').textContent = 'JusticiaVial';
  document.querySelector('.dash-brand-sub').textContent = TENANT.name;
  document.querySelector('.dash-user-name').textContent = CURRENT_USER.full_name;
  
  // Suscribirse a nuevos leads en tiempo real
  JV_API.subscribeToNewLeads(TENANT.id, (newLead) => {
    // Sonido de notificación / badge update
    const badge = document.querySelector('.nav-badge');
    if (badge) badge.textContent = parseInt(badge.textContent) + 1;
    if (activeTab === 'leads') renderLeadsPanel();
  });
  
  // Render inicial
  switchTab('leads');
}
```

### 6.2 Actualizar `renderLeadsPanel` para usar la API:

```javascript
async function renderLeadsPanel() {
  const panel = document.getElementById('panel-leads');
  panel.innerHTML = '<div style="text-align:center;padding:40px;color:var(--jv-gray-400)">Cargando leads...</div>';
  
  const { data: leads, error } = await JV_API.getLeads(TENANT.id, {
    scoreLevel: activeFilter === 'todos' ? null : activeFilter,
  });
  
  if (error) {
    panel.innerHTML = '<div style="padding:20px;color:var(--jv-danger)">Error cargando leads</div>';
    return;
  }
  
  // ... rest of the render logic using `leads` array
  // (mantener la misma estructura HTML, solo cambiar LEADS por leads)
}
```

### 6.3 Reemplazar la llamada `document.addEventListener('DOMContentLoaded', ...)` con:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dash-nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  
  initDashboard(); // ← Ahora usa la API
});
```

---

## PASO 7 — Crear página de login (5 min)

Crear un archivo **`login.html`**:

```html
<!DOCTYPE html>
<html lang="es-AR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — JusticiaVial</title>
  <link rel="stylesheet" href="css/main.css">
  <style>
    .login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--jv-gray-50); padding:16px; }
    .login-card { width:100%; max-width:400px; background:var(--jv-white); border:1px solid var(--jv-gray-200); border-radius:var(--radius-lg); padding:32px; }
    .login-logo { text-align:center; margin-bottom:24px; }
    .login-logo-mark { width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#1B3A5C,#2E86AB); display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:16px; font-weight:700; }
    .login-title { font-family:var(--font-display); font-size:22px; text-align:center; margin:12px 0 4px; }
    .login-sub { font-size:14px; color:var(--jv-gray-500); text-align:center; margin-bottom:24px; }
    .login-error { background:var(--jv-danger-bg); color:var(--jv-danger-text); padding:10px 14px; border-radius:var(--radius-md); font-size:13px; margin-bottom:16px; display:none; }
  </style>
</head>
<body>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-mark">JV</div>
        <div class="login-title">JusticiaVial</div>
        <div class="login-sub">Ingresá a tu panel de administración</div>
      </div>
      <div class="login-error" id="loginError"></div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="loginEmail" placeholder="tu@email.com">
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" class="form-input" id="loginPassword" placeholder="Tu contraseña">
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="doLogin()" id="loginBtn" style="margin-top:16px">
        Ingresar
      </button>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/api.js"></script>
  <script>
    async function doLogin() {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');
      
      errorEl.style.display = 'none';
      btn.textContent = 'Ingresando...';
      btn.disabled = true;
      
      const { data, error } = await JV_API.login(email, password);
      
      if (error) {
        errorEl.textContent = 'Email o contraseña incorrectos';
        errorEl.style.display = 'block';
        btn.textContent = 'Ingresar';
        btn.disabled = false;
        return;
      }
      
      window.location.href = 'dashboard.html';
    }
    
    // Enter para enviar
    document.getElementById('loginPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
    
    // Si ya tiene sesión, redirigir
    (async () => {
      const session = await JV_API.getSession();
      if (session) window.location.href = 'dashboard.html';
    })();
  </script>
</body>
</html>
```

---

## PASO 8 — Configurar el dominio personalizado por tenant (5 min)

Para que cada estudio tenga su URL (`rodriguez.justiciavial.com`), hay dos opciones:

### Opción A: Subdominios (recomendada para multi-tenant)
En tu hosting (Vercel/Netlify), configurar wildcard domain:
- `*.justiciavial.com` → apunta a tu proyecto

Luego en `landing.js`, detectar el slug del URL:
```javascript
const slug = window.location.hostname.split('.')[0]; // "rodriguez"
```

### Opción B: Ruta en URL (más simple para empezar)
Usar `justiciavial.com/rodriguez` y leer el slug de la URL:
```javascript
const slug = window.location.pathname.split('/')[1]; // "rodriguez"
```

---

## PASO 9 — Deploy a producción (5 min)

### Opción recomendada: Netlify (gratis)

1. Ir a **https://netlify.com** → login
2. En el dashboard, buscar la sección **"Deploy manually"**
3. **Arrastrá la carpeta `justiciavial/` completa** al área de drop
4. Esperar 30 segundos → tu sitio está en `https://random-name.netlify.app`
5. Ir a **Site settings → Domain management** para configurar tu dominio propio

### Alternativa: Vercel (gratis)

1. Instalar: `npm i -g vercel`
2. Desde la carpeta del proyecto: `vercel --prod`
3. Seguir las instrucciones

---

## PASO 10 — Verificación final

### Checklist:
- [ ] `tudominio.com` muestra la landing page
- [ ] Click en "Calcular" abre el calculador modal
- [ ] Completar paso 1 y verificar en Supabase → Table Editor → leads que aparece el registro
- [ ] Completar paso 2 y verificar que se actualizó con score y estimado
- [ ] El resultado muestra rango en pesos argentinos
- [ ] El botón de WhatsApp abre WhatsApp con el mensaje pre-armado
- [ ] `tudominio.com/login.html` permite loguearse
- [ ] `tudominio.com/dashboard.html` muestra los leads capturados
- [ ] Las notificaciones se crean automáticamente para leads nuevos
- [ ] El panel de configuración permite editar coeficientes

---

## EXTRAS: Configuraciones opcionales

### Habilitar Realtime (notificaciones en vivo)
En Supabase → Database → Replication:
1. Activar la tabla `leads` para realtime
2. Activar la tabla `notifications` para realtime

### Configurar emails transaccionales
En Supabase → Authentication → Email Templates:
1. Personalizar el email de confirmación
2. Personalizar el email de reset de password

### Configurar CORS
En Supabase → Settings → API → CORS:
Agregar tu dominio: `https://tudominio.com`

### Activar MFA (autenticación de 2 factores)
En Supabase → Authentication → Policies:
Activar MFA para mayor seguridad en el dashboard

---

## Estructura final de archivos

```
justiciavial/
├── index.html              ← Landing pública
├── dashboard.html          ← Panel admin
├── login.html              ← Página de login (crear en Paso 7)
├── css/
│   ├── main.css            ← Design system
│   ├── landing.css         ← Estilos landing
│   └── dashboard.css       ← Estilos dashboard
├── js/
│   ├── config.js           ← Configuración editable
│   ├── engine.js           ← Motor de cálculo y scoring
│   ├── api.js              ← ⚡ Conexión con Supabase (Paso 4)
│   ├── landing.js          ← Controlador landing
│   └── dashboard.js        ← Controlador dashboard
├── supabase-schema.sql     ← SQL para crear la BD (Paso 2)
└── DEPLOY-GUIDE.md         ← Esta guía
```

---

## Soporte y evolución

### Para agregar un nuevo estudio jurídico:
```sql
INSERT INTO tenants (name, slug, whatsapp, jurisdiction)
VALUES ('Nuevo Estudio', 'nuevo-estudio', '5491112345678', 'CABA');
```

### Para agregar un nuevo usuario:
1. Crear usuario en Supabase Auth
2. INSERT en tabla `users` con el `auth_id`

### Para modificar la fórmula:
Editar directamente en Supabase → Table Editor → tenants → columna `formula_config`
O desde el panel de Configuración del dashboard.

---

Versión 1.0 — JusticiaVial — Marzo 2026
