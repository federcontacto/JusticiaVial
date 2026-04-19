# JusticiaVial — Contexto del proyecto

## Qué es
SaaS legal argentino para estudios jurídicos especializados en accidentes de tránsito.
Dos partes: **landing pública** con calculador de indemnizaciones + **dashboard privado** para gestión de leads y litigios.

## Stack
- **Frontend**: HTML + CSS + JS vanilla (sin frameworks)
- **Backend**: Supabase (auth, postgres, realtime, storage)
- **Deploy**: Vercel (auto-deploy desde GitHub)
- **Repo**: https://github.com/federcontacto/JusticiaVial
- **Prod**: https://justicia-vial.vercel.app

## Archivos clave
```
index.html          → Landing pública (calculador multi-step)
login.html          → Login del estudio
dashboard.html      → App principal (panel admin)
js/config.js        → JV_CONFIG: datos del estudio, fórmula, textos, catálogos
js/engine.js        → Fórmula Vuoto + scoring de leads
js/api.js           → JV_API: cliente Supabase (todos los métodos)
js/landing.js       → Lógica del calculador (3 pasos + resultado)
js/dashboard.js     → Controlador del dashboard (1800+ líneas)
css/dashboard.css   → Estilos dashboard (2000+ líneas, incluye responsive)
supabase-FINAL.sql  → Schema completo de la base de datos
```

## Tenant actual (estudio de prueba)
- **Nombre**: Estudio Lagrenade & Asociados
- **Slug**: `lagrenade`
- **WhatsApp**: 5491130568410
- **Admin**: federcontacto@gmail.com

## Features del dashboard
| Panel | Estado |
|---|---|
| Leads — tabla con sorting, filtros, búsqueda | ✅ |
| Slide-over detalle de lead | ✅ |
| Quick-status dropdown en badge | ✅ |
| Métricas en tiempo real | ✅ |
| Realtime Supabase (nuevos leads sin recargar) | ✅ |
| WhatsApp con prefijo +549 AR | ✅ |
| Pipeline Kanban (5 etapas) con totales | ✅ |
| Analíticas (gráficos, distribución, embudo) | ✅ |
| Config con 7 acordeones | ✅ |
| ABM Usuarios (invitar, rol, activar, eliminar) | ✅ |
| Control de acceso por rol (admin/abogado/secretaria) | ✅ |
| Toast system (success/error/warning/info) | ✅ |
| Confirm modal propio (reemplaza confirm() nativo) | ✅ |
| Panel de notificaciones (campanita) | ✅ |
| Responsive / mobile (hamburger sidebar, 3 breakpoints) | ✅ |

## Roles y permisos
- **admin**: todo
- **abogado**: leads + pipeline + analíticas (sin config)
- **secretaria**: solo leads

## Estructura JS del dashboard
- `JV_DASH` = objeto público expuesto a `window`
- `JV_API` = cliente Supabase en `js/api.js`
- `JV_ENGINE` = fórmulas de cálculo en `js/engine.js`
- `JV_CONFIG` = configuración editable en `js/config.js`
- Realtime: `.channel('new-leads-${tenantId}')` en `subscribeToNewLeads`
- Toasts: `showToast(msg, type, duration)`
- Confirm modal: `showConfirm(msg, label, danger)` → Promise\<boolean\>
- Slide-over: `openSlideOver(html)` / `closeSlideOver()`

## Base de datos (Supabase)
Tablas principales: `tenants`, `users`, `leads`, `cases`, `documents`, `nlp_keywords`, `notifications`
Vista: `cases_full` (join de cases con datos del lead)
RLS activo en todas las tablas — scope por `tenant_id`
Trigger `notify_new_lead()` → inserta en `notifications` al crear un lead

## Cómo deployar
```bash
git add .
git commit -m "descripción"
git push origin main   # Vercel auto-deploya en ~30 seg
```

## Cosas pendientes / ideas futuras
- Paginación de leads (hoy carga hasta 200)
- Confirmación antes de mover etapa en pipeline
- Email automático de invitación a nuevos usuarios (depende config Supabase Auth)
- Más ciudades en el catálogo de la landing
