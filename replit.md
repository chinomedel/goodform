# GoodForm - Plataforma de Gestión de Formularios

## Overview
GoodForm is a comprehensive web platform for form management, supporting both visual drag-and-drop and code-based (HTML/CSS/JS) form builders. It features a robust authentication system, granular permissions, data export to Excel, real-time analytics dashboards, and support for public/private forms. The platform is designed with a dual SaaS and Auto-Host deployment model, including a licensing system. Its primary purpose is to provide a flexible and powerful tool for users to create, deploy, and manage various types of forms and analyze their responses, offering a professional and business-oriented user experience with a focus on ease of use and powerful customization options.

## User Preferences
- All texts should be in Spanish.
- Use `data-testid` on all interactive elements.
- Prefer Tailwind CSS for styling.
- Utilize reusable Shadcn/UI components.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript, leveraging Shadcn/UI with Tailwind CSS for a modern, responsive design. The aesthetic is inspired by Material Design 3 and Linear, aiming for a professional and business-oriented look. Application appearance (appName, logo, favicon, primary color) is highly customizable via an admin configuration page with real-time previews.

### Technical Implementations
- **Dual Form Builder**: Supports both visual drag-and-drop and code-based (HTML/CSS/JS) form creation with a live editor and real-time preview, including auto-saving.
- **Authentication & Authorization**: Email/password authentication using Passport-local with `scrypt` hashing. Role-based access control (super_admin, admin_auto_host, visualizador_auto_host, cliente_saas) and granular form-level permissions (Owner, Editor, Viewer).
- **User Management & Blocking States**: Super Admin and Admin Auto-host can manage user states for access control.
  - **User States**:
    - `isDeleted`: Boolean flag marking users as deleted
    - `blockReason`: Enum with blocking reasons ('non_payment', 'login_attempts', 'general')
    - `blockedAt`: Timestamp when user was blocked
  - **Authentication Enforcement**:
    - Login validation checks for deleted or blocked users before authentication
    - Specific error messages for each block type (non-payment, login attempts, general)
    - Active sessions are automatically invalidated when users are blocked or deleted
    - Blocked/deleted users cannot log in or access the system
  - **Database Schema**:
    - `block_reason` enum type with values: non_payment, login_attempts, general
    - User table columns: is_deleted (boolean NOT NULL DEFAULT false), block_reason (nullable), blocked_at (nullable timestamp)
- **Data Export**: Exports form responses to Excel using ExcelJS.
- **Real-time Analytics**: Customizable charts (bar, line, pie, area, scatter) powered by Recharts, supporting various aggregation types and cross-analysis for both visual and code-based forms. Features an interactive ChartBuilder UI and API for chart management.
- **AI Integration**: Supports multiple AI providers (OpenAI, Deepseek) configured via an admin page. Features an AI Analyst Agent integrated into form responses for natural language data analysis, automatic chart creation/editing/deletion via function calls, and persistent chat history. API keys are securely stored encrypted in PostgreSQL. Granular token pricing system with separate fields for input tokens, output tokens, and cache tokens per provider, with cost calculation: (prompt_tokens × inputPrice + completion_tokens × outputPrice) / 1,000,000. Prices stored in cents for precision.
- **SMTP Email Configuration**: Secure SMTP server configuration for email notifications, accessible to Super Admin and Admin Auto-host roles. Credentials are encrypted and stored in PostgreSQL.
- **Password Recovery System**: Implements a complete forgot password and reset password flow with email notifications, secure token management, and robust security features.
- **Usage Reports**: Provides application usage analytics (e.g., login activity, password resets) for Super Admin and Admin Auto-host roles, displayed via Recharts.
- **Auto-saving**: Implemented in the form builder with debounce for title and description.
- **Database Initialization**: Automatic table creation and initial data seeding on first application start.
- **Validation**: Frontend validation with React Hook Form and Zod; backend validation for permissions and data integrity.

### Feature Specifications
- **Deployment Modes**:
    - **SaaS (default)**: Public registration enabled, full features, super-admin manages licenses for Auto-Host instances.
    - **Auto-Host**: Requires initial setup wizard, public registration blocked, license key required for unlimited forms (5-form limit without).
- **Licensing System**: Licenses are validated daily online against the SaaS instance, with a 3-day grace period for connectivity issues.
- **Configurable Application Settings**: Admins can customize application name, logo URL, favicon URL, and primary color with real-time feedback.

### System Design Choices
- **Backend**: Express.js REST API.
- **Frontend**: React with TypeScript, React Query for server state management, Wouter for routing.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema definition and querying. All data, including sessions, is persisted in PostgreSQL.
- **Security**: Passwords hashed with scrypt, httpOnly session cookies, robust backend role/permission validation, and input sanitization.

## External Dependencies

- **Database**: PostgreSQL
- **Backend Framework**: Express.js
- **ORM**: Drizzle ORM
- **Authentication**: Passport-local, scrypt, connect-pg-simple
- **Frontend Framework**: React, TypeScript
- **State Management (Frontend)**: React Query
- **Routing (Frontend)**: Wouter
- **UI Component Library/Styling**: Shadcn/UI, Tailwind CSS
- **Data Export**: ExcelJS
- **Charting Library**: Recharts
- **Form Validation (Frontend)**: React Hook Form, Zod
- **AI Integration**: OpenAI, Deepseek
- **Email**: Nodemailer