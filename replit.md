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
- **Real-time Analytics**: Customizable charts (bar, line, pie, area, scatter) with various aggregation types (count, sum, avg, min, max) powered by Recharts, applicable to both visual and code-based forms.
  - Charts are created via ChartBuilder UI component
  - ChartRenderer processes responses and normalizes data from both visual forms (answers.values) and code-mode forms (direct answers)
  - Supports dynamic fields from responses and URL parameters
  - Proper handling of array-valued fields (multi-select) and accurate average calculation
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