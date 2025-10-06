# GoodForm - Plataforma de Gestión de Formularios

## Descripción General
GoodForm es una plataforma web completa en español para gestión de formularios con las siguientes capacidades:
- Constructor de formularios con arrastrar y soltar
- Autenticación email/password con hashing seguro (scrypt)
- Sistema de roles (Admin, Gestor, Visualizador, Cliente)
- Permisos granulares por formulario
- Exportación a Excel y dashboard de análisis
- Formularios públicos y privados
- Páginas de administración para gestión de usuarios y configuración (solo admin)

## Estado del Proyecto
✅ **Completado:**
- Backend completo con API REST
- Base de datos PostgreSQL con Drizzle ORM
- Sistema de autenticación email/password con passport-local
- Frontend React con React Query
- Dashboard con estadísticas en tiempo real
- Constructor de formularios con auto-guardado
- Sistema de respuestas públicas
- Exportación a Excel
- Sistema de roles de 4 niveles (Admin, Gestor, Visualizador, Cliente)
- Páginas de administración (Usuarios y Configuración) exclusivas para admins
- **Sistema Dual SaaS + Auto-Host:**
  - Detección de modo deployment (DEPLOYMENT_MODE)
  - Wizard de setup inicial para Auto-Host
  - Bloqueo de registro público en Auto-Host
  - Sistema de licencias con validación online
  - Límite de 5 formularios sin licencia
  - Endpoints de administración de licencias (super admin)

🚧 **En Progreso:**
- Dashboard de generación de códigos para super admin
- Validación diaria automática con período de gracia
- Pestaña de Licencia en Settings

## Arquitectura

### Backend (`server/`)
- **Express.js** como servidor web
- **Drizzle ORM** para PostgreSQL
- **Passport-local** para autenticación email/password
- **Scrypt** para hashing de contraseñas
- **connect-pg-simple** para almacenamiento de sesiones en PostgreSQL
- **ExcelJS** para exportación de datos

### Frontend (`client/`)
- **React** con TypeScript
- **React Query** para estado del servidor
- **Wouter** para enrutamiento
- **Shadcn/UI** con Tailwind CSS
- **Material Design 3** con estética Linear

### Base de Datos
Esquema completo en `shared/schema.ts`:
- `users` - Usuarios con roles
- `forms` - Formularios con configuración
- `form_fields` - Campos dinámicos de formularios
- `form_responses` - Respuestas de formularios
- `form_permissions` - Permisos colaborativos
- `sessions` - Sesiones de Passport
- `app_config` - Configuración global de la aplicación (single-row, id='default')

## Flujo de Autenticación

### Rutas de Autenticación
- `POST /api/register` - Registrar nuevo usuario (email, password, firstName?, lastName?)
- `POST /api/login` - Iniciar sesión con email/password
- `POST /api/logout` - Cerrar sesión
- `GET /api/user` - Obtener usuario actual autenticado

### Frontend
- `/auth` - Página de login/registro con tabs
- `useAuth` hook - Context para manejo de autenticación
- `ProtectedRoute` - Componente para proteger rutas privadas

### Notas Importantes
1. **Contraseñas**: Se hashean con scrypt (salt + hash) antes de almacenar en base de datos
2. **Sesiones**: Se almacenan en PostgreSQL usando `connect-pg-simple` con cookies httpOnly
3. **Seguridad**: Cookies configuradas como secure/sameSite según el entorno
4. **Roles**: Usuarios nuevos se crean como "gestor" por defecto

## Roles y Permisos

### Roles del Sistema
- **Admin**: Acceso completo, puede gestionar usuarios y configuración del sistema
- **Gestor**: Puede crear, editar y compartir formularios
- **Visualizador**: Solo puede ver respuestas de formularios compartidos
- **Cliente**: Rol básico para usuarios externos, acceso limitado

### Permisos por Formulario
- **Owner**: Creador del formulario, control total
- **Editor**: Puede editar formulario y ver respuestas
- **Viewer**: Solo puede ver respuestas

## Rutas Principales

### Públicas
- `/auth` - Página de login/registro
- `/public/:id` - Formulario público para responder

### Autenticadas (requieren login)
- `/` - Dashboard con estadísticas (redirige a /auth si no autenticado)
- `/forms` - Lista de formularios
- `/builder` - Crear nuevo formulario
- `/builder/:id` - Editar formulario existente
- `/responses/:id` - Ver respuestas de formulario
- `/users` - Gestión de usuarios (solo admin)
- `/settings` - Configuración de cuenta y sistema (solo admin)

## API Endpoints

### Autenticación
- `POST /api/register` - Registrar nuevo usuario
- `POST /api/login` - Iniciar sesión
- `POST /api/logout` - Cerrar sesión
- `GET /api/user` - Obtener usuario actual

### Formularios
- `GET /api/forms` - Listar formularios del usuario
- `POST /api/forms` - Crear formulario
- `GET /api/forms/:id` - Obtener formulario
- `PATCH /api/forms/:id` - Actualizar formulario
- `DELETE /api/forms/:id` - Eliminar formulario
- `POST /api/forms/:id/publish` - Publicar/despublicar
- `GET /api/forms/:id/export` - Exportar a Excel

### Formularios Públicos
- `GET /api/public/forms/:id` - Obtener formulario público
- `POST /api/public/forms/:id/responses` - Enviar respuesta

### Respuestas
- `GET /api/forms/:id/responses` - Listar respuestas

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales

### Usuarios (Admin)
- `GET /api/users` - Listar usuarios
- `PATCH /api/users/:id/role` - Cambiar rol

### Configuración (Admin)
- `GET /api/config` - Obtener configuración global de la aplicación
- `PATCH /api/config` - Actualizar configuración (appName, logoUrl, faviconUrl, primaryColor)

## Características Técnicas

### Auto-guardado
El constructor de formularios implementa auto-guardado con debounce de 1 segundo para título y descripción.

### Configuración de la Aplicación
La página de Configuración permite a los administradores personalizar la aplicación:
- **Nombre de la aplicación**: Personalizable para self-hosting, se refleja en sidebar, landing page y título del documento
- **Logo URL**: URL del logo corporativo con preview en tiempo real, se muestra en sidebar y landing page
- **Favicon URL**: URL del favicon con preview en tiempo real, se aplica dinámicamente al documento
- **Color primario**: Color de la marca con tres opciones de selección:
  - Selector de color nativo de HTML5
  - Paleta de 12 colores predefinidos
  - Input de texto para códigos hexadecimales manuales
- Previsualizaciones en tiempo real usando `form.watch()`
- Los campos opcionales (logo/favicon) pueden ser limpiados
- Backend normaliza strings vacíos a null automáticamente
- **ConfigProvider**: Componente que aplica dinámicamente:
  - Convierte color hex a HSL y actualiza variables CSS (--primary, --sidebar-primary, --ring)
  - Actualiza favicon del documento
  - Actualiza título del documento con el nombre de la app
  - Se ejecuta al inicio y al cambiar la configuración

### Página de Usuarios
- Lista todos los usuarios con sus roles y fechas de registro
- Permite cambiar roles de usuarios (solo admin)
- Muestra estado vacío amigable en instalaciones nuevas sin usuarios

### Validación
- Frontend: React Hook Form con Zod
- Backend: Validación de permisos en todas las rutas

### Seguridad
- Contraseñas hasheadas con scrypt (salt + hash)
- Sesiones almacenadas en PostgreSQL con cookies httpOnly
- Cookies configuradas como secure/sameSite según entorno
- Validación de roles y permisos en backend
- Sanitización de entrada de usuario
- Rutas protegidas con middleware isAuthenticated

## Variables de Entorno Requeridas

```
DATABASE_URL - URL de PostgreSQL (auto-configurado en Replit)
SESSION_SECRET - Secret para sesiones (auto-configurado en Replit)
NODE_ENV - Entorno de ejecución (development/production)
```

## Ejecutar el Proyecto

```bash
npm run dev
```

Esto inicia:
- Backend Express en modo desarrollo
- Frontend Vite con HMR
- Servidor único en puerto 5000

## Sistema Dual: SaaS + Auto-Host

### Modos de Deployment

#### Modo SaaS (por defecto)
- `DEPLOYMENT_MODE=saas` o sin variable
- nmedelb@gmail.com es el super administrador (isSuperAdmin=true)
- Registro público habilitado
- Todas las funcionalidades disponibles sin límites
- Puede generar licencias para instalaciones Auto-Host

#### Modo Auto-Host
- `DEPLOYMENT_MODE=self-hosted`
- Primera ejecución: redirige a `/setup` para crear admin inicial
- Registro público bloqueado - solo el admin crea usuarios
- Límite de 5 formularios sin licencia válida
- Requiere código de licencia para uso ilimitado

### Sistema de Licencias

#### Estructura de Licencia
- `licenseKey`: Código único (GF-XXXXX-XXXXX)
- `issuedToEmail`: Email del cliente
- `expiresAt`: Fecha de expiración
- `status`: active | revoked | expired

#### Validación (Modo Auto-Host)
1. **Validación Online**: Auto-Host consulta a SaaS diariamente
   - Endpoint: `POST /api/license/validate`
   - Valida existencia, estado y expiración
2. **Período de Gracia**: 3 días sin conexión
   - Si no puede validar, usa última validación exitosa
   - Si > 3 días, marca licencia como inválida
3. **Límite de Formularios**: Sin licencia válida = máx 5 formularios

### Endpoints del Sistema

#### Setup (Auto-Host)
- `POST /api/setup` - Crear admin inicial y completar setup
- `GET /api/setup/status` - Verificar si setup está completo

#### Licencias (Auto-Host)
- `GET /api/license/status` - Estado actual de licencia
- `POST /api/license/activate` - Activar código de licencia

#### Administración de Licencias (Super Admin - SaaS)
- `POST /api/admin/licenses/issue` - Generar nueva licencia
- `GET /api/admin/licenses` - Listar todas las licencias
- `PATCH /api/admin/licenses/:id/revoke` - Revocar licencia

#### Validación (SaaS)
- `POST /api/license/validate` - Validar licencia (usado por Auto-Host)

### Flujos Principales

#### Instalación Auto-Host
1. Usuario descarga e instala aplicación
2. Configura `DEPLOYMENT_MODE=self-hosted`
3. Primera visita → redirige a `/setup`
4. Completa wizard: email, password, (opcional) código de licencia
5. Crea deployment y admin inicial
6. Redirige a `/auth` para login

#### Generación de Licencia (Super Admin)
1. nmedelb@gmail.com accede a dashboard de licencias
2. Completa formulario: email cliente, fecha expiración, notas
3. Sistema genera código único (GF-XXXXX-XXXXX)
4. Guarda en DB con estado "active"
5. Super admin copia código y envía al cliente

#### Activación de Licencia (Cliente Auto-Host)
1. Admin ingresa a `/settings` > Licencia
2. Ingresa código recibido
3. Sistema valida contra SaaS
4. Si válida: actualiza deployment con licencia
5. Desbloquea funcionalidades

## Próximos Pasos Posibles

1. **Dashboard de Licencias**: UI completa para super admin
2. **Validación Automática**: Job diario para verificar licencias
3. **Sistema de Notificaciones**: Emails cuando se reciben respuestas
4. **Templates de Formularios**: Plantillas pre-diseñadas
5. **Lógica Condicional**: Campos que aparecen según respuestas anteriores
6. **Análisis Avanzado**: Gráficos más complejos y filtros
7. **Webhooks**: Integración con servicios externos
8. **Multi-idioma**: Soporte para otros idiomas además de español

## Notas de Desarrollo

### Convenciones de Código
- Todos los textos en español
- Data-testid en todos los elementos interactivos
- Tailwind CSS para estilos
- Componentes Shadcn/UI reutilizables

### Estructura de Almacenamiento
El proyecto usa almacenamiento en PostgreSQL (no memoria) para persistencia de datos en producción.

### Material Design 3
Los colores y componentes siguen Material Design 3 con refinamiento estético inspirado en Linear para look profesional y empresarial.
