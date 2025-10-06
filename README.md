# GoodForm

**Plataforma completa de gestión de formularios en español** con constructor drag-and-drop, sistema de roles, analytics dashboard y exportación a Excel.

## ✨ Características

- 🎨 **Constructor Visual**: Arrastrar y soltar campos de formulario
- 📊 **Dashboard Analytics**: Estadísticas en tiempo real
- 👥 **Sistema de Roles**: Admin, Gestor, Visualizador, Cliente
- 🔐 **Autenticación Segura**: Email/password con hashing scrypt
- 📤 **Exportación Excel**: Descarga respuestas en formato XLSX
- 🌐 **Formularios Públicos**: Comparte formularios sin login
- 🎯 **Permisos Granulares**: Control de acceso por formulario

## 🚀 Instalación

GoodForm se puede instalar de 3 formas diferentes:

### 📦 Opción 1: NPM Global (Desarrollo)

```bash
npm install -g goodform
goodform setup
```

**Requisitos:** Node.js 18+, PostgreSQL 14+

[Ver guía completa](NPM_DISTRIBUTION.md)

### 🐳 Opción 2: Docker

```bash
docker build -t goodform .
docker run -d -p 5000:5000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/db" \
  -e SESSION_SECRET="your-secret" \
  goodform
```

**Requisitos:** Docker, PostgreSQL accesible

### 🐳 Opción 3: Docker Compose (Recomendado)

```bash
git clone https://github.com/tu-usuario/goodform.git
cd goodform
cp .env.example .env
# Edita .env con tus credenciales
docker-compose up -d
```

**Incluye PostgreSQL automáticamente** ✅

[Ver guía completa de instalación](INSTALL.md)

## 🔑 Sistema Dual: SaaS + Auto-Host

GoodForm funciona en 2 modos:

### Modo SaaS (por defecto)
- Super administrador: `nmedelb@gmail.com`
- Registro público habilitado
- Generación de códigos de licencia
- Sin límites de formularios

### Modo Auto-Host
- Wizard de setup inicial
- Registro bloqueado (solo admin crea usuarios)
- Límite: 5 formularios sin licencia
- Validación online con período de gracia de 3 días

Configura con variable de entorno:
```bash
DEPLOYMENT_MODE=self-hosted  # Para Auto-Host
DEPLOYMENT_MODE=saas         # Para SaaS (por defecto)
```

## 🎯 Inicio Rápido

1. **Primera vez - Completar Setup:**
   - Visita `http://localhost:5000/setup`
   - Crea tu cuenta de administrador
   - (Opcional) Ingresa código de licencia

2. **Crear Formulario:**
   - Dashboard → "Nuevo Formulario"
   - Arrastra campos al constructor
   - Publica y comparte

3. **Ver Respuestas:**
   - Dashboard → "Ver Respuestas"
   - Exporta a Excel

## 📚 Documentación

- [Guía de Instalación Completa](INSTALL.md)
- [Distribución NPM](NPM_DISTRIBUTION.md)
- [Documentación Técnica](replit.md)

## 🛠️ Stack Tecnológico

**Frontend:**
- React + TypeScript
- Tailwind CSS + Shadcn/UI
- React Query + Wouter

**Backend:**
- Node.js + Express
- Drizzle ORM + PostgreSQL
- Passport.js (autenticación)

## 🔐 Variables de Entorno

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/goodform
SESSION_SECRET=tu-secret-aqui
DEPLOYMENT_MODE=self-hosted  # o 'saas'
PORT=5000
```

## 📝 Licencia

MIT License - Uso libre para proyectos personales y comerciales

## 🤝 Soporte

- 📧 Email: support@goodform.com
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/goodform/issues)
- 📖 Docs: [docs.goodform.com](https://docs.goodform.com)

---

**Hecho con ❤️ en español**
