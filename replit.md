# GoodForm - Plataforma de Gestión de Formularios

## Descripción General
GoodForm es una plataforma web completa en español para gestión de formularios con las siguientes capacidades:
- Constructor de formularios con arrastrar y soltar
- Autenticación con Replit Auth
- Sistema de roles (Admin, Gestor, Visualizador)
- Permisos granulares por formulario
- Exportación a Excel y dashboard de análisis
- Formularios públicos y privados

## Estado del Proyecto
✅ **Completado:**
- Backend completo con API REST
- Base de datos PostgreSQL con Drizzle ORM
- Sistema de autenticación con Replit Auth
- Frontend React con React Query
- Dashboard con estadísticas en tiempo real
- Constructor de formularios con auto-guardado
- Sistema de respuestas públicas
- Exportación a Excel

## Arquitectura

### Backend (`server/`)
- **Express.js** como servidor web
- **Drizzle ORM** para PostgreSQL
- **Replit Auth** para autenticación OAuth
- **Passport.js** para manejo de sesiones
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

## Flujo de Autenticación

### Rutas de Autenticación
- `/api/login` - Inicia el flujo OAuth con Replit
- `/api/callback` - Callback de OAuth
- `/api/logout` - Cierra sesión
- `/api/auth/user` - Obtiene usuario actual

### Notas Importantes
1. **Replit Auth requiere estar dentro del entorno de Replit** para funcionar correctamente
2. Las sesiones se almacenan en PostgreSQL usando `connect-pg-simple`
3. Los tokens se refrescan automáticamente cuando expiran
4. Los usuarios se crean/actualizan automáticamente en el primer login

## Roles y Permisos

### Roles del Sistema
- **Admin**: Acceso completo, puede gestionar usuarios
- **Gestor**: Puede crear, editar y compartir formularios
- **Visualizador**: Solo puede ver respuestas de formularios compartidos

### Permisos por Formulario
- **Owner**: Creador del formulario, control total
- **Editor**: Puede editar formulario y ver respuestas
- **Viewer**: Solo puede ver respuestas

## Rutas Principales

### Públicas
- `/` - Landing page (si no autenticado)
- `/public/:id` - Formulario público para responder

### Autenticadas
- `/` - Dashboard con estadísticas
- `/forms` - Lista de formularios
- `/builder` - Crear nuevo formulario
- `/builder/:id` - Editar formulario existente
- `/responses/:id` - Ver respuestas de formulario

## API Endpoints

### Autenticación
- `GET /api/auth/user` - Usuario actual

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

## Características Técnicas

### Auto-guardado
El constructor de formularios implementa auto-guardado con debounce de 1 segundo para título y descripción.

### Validación
- Frontend: React Hook Form con Zod
- Backend: Validación de permisos en todas las rutas

### Seguridad
- CSRF protection mediante cookies httpOnly
- Validación de roles y permisos en backend
- Sanitización de entrada de usuario

## Variables de Entorno Requeridas

```
DATABASE_URL - URL de PostgreSQL
SESSION_SECRET - Secret para sesiones
REPLIT_DOMAINS - Dominios permitidos para OAuth
REPL_ID - ID del Repl (auto-configurado)
ISSUER_URL - URL del emisor OAuth (opcional, default: https://replit.com/oidc)
```

## Ejecutar el Proyecto

```bash
npm run dev
```

Esto inicia:
- Backend Express en modo desarrollo
- Frontend Vite con HMR
- Servidor único en puerto 5000

## Próximos Pasos Posibles

1. **Sistema de Notificaciones**: Emails cuando se reciben respuestas
2. **Templates de Formularios**: Plantillas pre-diseñadas
3. **Lógica Condicional**: Campos que aparecen según respuestas anteriores
4. **Análisis Avanzado**: Gráficos más complejos y filtros
5. **Webhooks**: Integración con servicios externos
6. **Multi-idioma**: Soporte para otros idiomas además de español

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
