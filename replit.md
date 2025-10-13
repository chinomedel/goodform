# GoodForm - Plataforma de Gestión de Formularios

## Overview
GoodForm is a comprehensive web platform for form management, supporting both visual drag-and-drop and code-based (HTML/CSS/JS) form builders. It features a robust authentication system, granular permissions, data export to Excel, real-time analytics dashboards, and support for public/private forms. The platform is designed with a dual SaaS and Auto-Host deployment model, including a licensing system. Its primary purpose is to provide a flexible and powerful tool for users to create, deploy, and manage various types of forms and analyze their responses. The project aims to offer a professional and business-oriented user experience with a focus on ease of use and powerful customization options.

## User Preferences
- All texts should be in Spanish.
- Use `data-testid` on all interactive elements.
- Prefer Tailwind CSS for styling.
- Utilize reusable Shadcn/UI components.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript, leveraging Shadcn/UI with Tailwind CSS for a modern, responsive design. The aesthetic is inspired by Material Design 3 and Linear, aiming for a professional and business-oriented look. The application's appearance (appName, logo, favicon, primary color) is highly customizable via an admin configuration page, with real-time previews and dynamic CSS variable updates.

### Technical Implementations
- **Dual Form Builder**:
    - **Visual Mode**: Drag-and-drop interface with predefined fields.
    - **Code Mode**: Live editor for custom HTML, CSS, and JavaScript with real-time preview.
    - Toggle functionality to switch between modes, with auto-saving.
- **Authentication**: Email/password authentication using Passport-local, `scrypt` for secure password hashing, and sessions stored in PostgreSQL via `connect-pg-simple`.
- **Authorization**: Role-based access control with deployment-specific roles (`super_admin`, `admin_auto_host`, `visualizador_auto_host`, `cliente_saas`) and granular form-level permissions (Owner, Editor, Viewer).
- **Data Export**: ExcelJS for exporting form responses to Excel.
- **Real-time Analytics y Análisis Cruzado**: Customizable charts (bar, line, pie, area, scatter) with various aggregation types (count, sum, avg, min, max) powered by Recharts, applicable to both visual and code-based forms.
  - **ChartBuilder UI**: Constructor de gráficos con soporte para análisis cruzado y edición completa
    - Campo "Agrupar por (Eje X)": Selecciona el campo por el cual agrupar datos (ej: origen, región, categoría)
    - Campo "Tipo de Agregación": Selecciona cómo agregar los datos
      - "Contar ocurrencias": Cuenta cuántas respuestas hay por cada valor del eje X
      - "Sumar valores": Suma los valores de un campo numérico por cada grupo
      - "Promedio de valores": Calcula el promedio de un campo numérico por cada grupo
      - "Valor mínimo/máximo": Encuentra el min/max de un campo numérico por cada grupo
    - Campo "Campo a Analizar (Eje Y)": **Aparece automáticamente** cuando se selecciona suma/promedio/min/max. Permite seleccionar qué campo numérico se debe agregar.
    - **Funcionalidad de Edición**: Los gráficos existentes pueden editarse haciendo clic en el botón de editar (ícono de lápiz) en cada gráfico. El diálogo ChartBuilder se abre pre-llenado con la configuración actual.
  - **Ejemplo de Análisis Cruzado**: "Promedio de NPS por Origen"
    - Eje X (Agrupar por): "origen" 
    - Agregación: "Promedio de valores"
    - Eje Y (Campo a Analizar): "nps"
    - Resultado: Gráfico mostrando el NPS promedio para cada origen
  - ChartRenderer procesa respuestas y normaliza datos de formularios visuales (answers.values) y de código (answers directos)
  - Soporta campos dinámicos extraídos de respuestas y parámetros URL
  - Manejo correcto de campos con valores array (multi-select) y cálculo preciso de promedios
  - **API de Gráficos**:
    - POST `/api/forms/:formId/charts` - Crear nuevo gráfico
    - PATCH `/api/charts/:id` - Actualizar gráfico existente
    - DELETE `/api/charts/:id` - Eliminar gráfico
    - GET `/api/forms/:formId/charts` - Obtener todos los gráficos de un formulario
- **AI Integration**: Support for multiple AI providers (OpenAI and Deepseek) configurable through an admin interface.
  - **AI Configuration Page**: Admin-only page (`/ai-config`) for managing AI providers
    - Provider selection: Choose between OpenAI (GPT-3.5, GPT-4, GPT-5) or Deepseek
    - API Key management: Secure form to input and update API keys directly from the web interface
    - API Key testing: Test connections to verify API keys are working
    - Active provider indicator: Visual badge showing which provider is currently active
    - **Secure key storage**: API keys stored encrypted in PostgreSQL database using AES-256-CBC encryption
      - Keys never exposed to frontend (password input fields)
      - Encryption key derived from DATABASE_URL or ENCRYPTION_KEY environment variable
      - Fallback support for Replit Secrets (OPENAI_API_KEY, DEEPSEEK_API_KEY)
  - **AI Analyst Agent**: Intelligent chat agent integrated into FormResponsesPage (third tab "Agente Analista")
    - **Natural language chat**: Users can ask questions about form data and get intelligent analysis
    - **Automatic chart management**: Can create, edit, and delete charts through conversation
    - **Function calling**: Uses tool calls to execute actions:
      - `get_form_responses`: Retrieve and analyze form response data
      - `create_chart`: Create new visualization charts
      - `update_chart`: Modify existing charts
      - `delete_chart`: Remove charts
      - `list_charts`: View all existing charts for the form
    - **Permission enforcement**: Only users with edit permissions can create/modify/delete charts
    - **Chat persistence**: Conversation history stored in `chat_messages` table with role, content, and tool calls
    - **Smart responses**: Generates meaningful human-readable messages even when executing tools
    - **Error handling**: Provider-specific and permission-specific error messages
    - **UI Features**: 
      - Message history display with user/assistant bubbles
      - Loading indicators during AI processing
      - Tool execution feedback with emojis and descriptions
      - Automatic chart refresh after modifications
      - Toast notifications for success/error states
  - **API Endpoints**:
    - GET `/api/ai-config` - Retrieve current AI configuration
    - PATCH `/api/ai-config` - Update active provider (admin only)
    - POST `/api/ai-config/update-keys` - Update and encrypt API keys (admin only)
    - GET `/api/ai-config/keys-status` - Check if keys are configured (admin only)
    - POST `/api/ai-config/test/:provider` - Test API connection for a specific provider
    - POST `/api/forms/:formId/chat` - Chat with AI analyst agent (requires form access)
    - GET `/api/forms/:formId/chat/history` - Get chat conversation history
  - Database: 
    - `ai_config` table stores active provider preference and encrypted API keys
    - `chat_messages` table stores conversation history with tool call metadata
  - Security: 
    - Crypto utilities (server/crypto-utils.ts) handle encryption/decryption using Node.js crypto module
    - Permission checks before all chart mutation operations
    - API keys never exposed to frontend
- **SMTP Email Configuration**: Secure email server configuration accessible only to Super Admin and Admin Auto-host roles.
  - **SMTP Configuration Page**: Admin-only page (`/smtp-config`) for managing email server settings
    - Server settings: Host, port, secure connection (SSL/TLS) toggle
    - Sender configuration: From email and from name fields
    - Credential management: Secure form to input and update SMTP username and password
    - Connection testing: Test SMTP connection to verify settings are working
    - Auto-save: Server settings save automatically when leaving each field
    - **Secure credential storage**: SMTP credentials stored encrypted in PostgreSQL database using AES-256-CBC encryption
      - Credentials never exposed to frontend (password input fields)
      - Encryption key derived from DATABASE_URL or ENCRYPTION_KEY environment variable
      - Same encryption utilities as AI config (server/crypto-utils.ts)
  - **API Endpoints**:
    - GET `/api/smtp-config` - Retrieve current SMTP configuration (super_admin, admin_auto_host only)
    - PATCH `/api/smtp-config` - Update SMTP settings (super_admin, admin_auto_host only)
    - POST `/api/smtp-config/update-credentials` - Update and encrypt credentials (super_admin, admin_auto_host only)
    - GET `/api/smtp-config/credentials-status` - Check if credentials are configured (super_admin, admin_auto_host only)
    - POST `/api/smtp-config/test` - Test SMTP connection (super_admin, admin_auto_host only)
  - Database: 
    - `smtp_config` table stores host, port, secure flag, encrypted credentials, and sender information
  - Security: 
    - Role-based access control (only super_admin and admin_auto_host)
    - Encrypted credential storage
    - SMTP credentials never exposed to frontend
- **Auto-saving**: Implemented in the form builder with a 1-second debounce for title and description.
- **Database Initialization**: Automatic table creation and initial data seeding (e.g., roles) on the first application start, eliminating manual migrations.
- **Validation**: Frontend validation with React Hook Form and Zod; backend validation ensures permissions and data integrity.

### Feature Specifications
- **Deployment Modes**:
    - **SaaS (default)**: Public registration enabled, full features, super-admin manages licenses for Auto-Host instances.
    - **Auto-Host**: Requires initial setup wizard for admin creation, public registration blocked, license key required for unlimited forms (5-form limit without).
- **Licensing System**: Licenses (`licenseKey`, `issuedToEmail`, `expiresAt`, `status`) are validated daily online against the SaaS instance, with a 3-day grace period for connectivity issues.
- **Configurable Application Settings**: Admins can customize application name, logo URL, favicon URL, and primary color with real-time feedback.

### System Design Choices
- **Backend**: Express.js REST API.
- **Frontend**: React with TypeScript, React Query for server state management, Wouter for routing.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema definition and querying. All data, including sessions, is persisted in PostgreSQL.
- **Security**: Passwords hashed with scrypt, httpOnly session cookies configured securely, robust backend role/permission validation, and input sanitization.

## External Dependencies

- **Database**: PostgreSQL
- **Backend Framework**: Express.js
- **ORM**: Drizzle ORM
- **Authentication**: Passport-local, scrypt (for hashing), connect-pg-simple (for session storage)
- **Frontend Framework**: React, TypeScript
- **State Management (Frontend)**: React Query
- **Routing (Frontend)**: Wouter
- **UI Component Library/Styling**: Shadcn/UI, Tailwind CSS, Material Design 3 (aesthetic inspiration)
- **Data Export**: ExcelJS
- **Charting Library**: Recharts
- **Form Validation (Frontend)**: React Hook Form, Zod
- **AI Integration**: OpenAI (GPT models), Deepseek (Chat models)
- **Email**: Nodemailer (SMTP email sending)