# GoodForm - Resumen de Deployment

## ✅ ¿Qué incluye la instalación?

Cuando alguien instala GoodForm con cualquiera de los 3 métodos (NPM, Docker, Docker Compose), obtiene:

### 🗄️ Base de Datos Completa (Automática)

**Sí, la creación de la base de datos está 100% automatizada.**

En el **primer arranque**, el servidor:

1. ✅ Detecta si PostgreSQL está vacío
2. ✅ Crea automáticamente todas las tablas:
   - `users` - Sistema de usuarios y autenticación
   - `forms` - Formularios
   - `form_fields` - Campos dinámicos
   - `form_responses` - Respuestas
   - `form_permissions` - Permisos
   - `deployments` - Config de deployment (Auto-Host)
   - `licenses` - Códigos de licencia (SaaS)
   - `sessions` - Sesiones de usuario
   - `app_config` - Configuración global
3. ✅ Inserta datos iniciales necesarios
4. ✅ Inicia el servidor

**No se requiere ningún paso manual de migración** 🎉

### 📋 Proceso de Instalación Completo

#### Opción 1: Docker Compose (Más Simple)
```bash
docker-compose up -d
```
**Incluye:**
- ✅ PostgreSQL 16 (instalado automáticamente)
- ✅ Aplicación GoodForm
- ✅ Creación automática de tablas
- ✅ Volúmenes persistentes
- ✅ Network configurado

**El usuario solo debe:**
1. Editar `.env` con credenciales
2. Ejecutar `docker-compose up -d`
3. Visitar `http://localhost:5000/setup`

#### Opción 2: Docker Standalone
```bash
docker run -p 5000:5000 -e DATABASE_URL="..." goodform
```
**Incluye:**
- ✅ Aplicación GoodForm
- ✅ Creación automática de tablas
- ⚠️ PostgreSQL externo requerido

**El usuario debe:**
1. Tener PostgreSQL instalado por separado
2. Pasar DATABASE_URL como variable
3. Visitar `http://localhost:5000/setup`

#### Opción 3: NPM Global
```bash
npm install -g goodform
goodform start
```
**Incluye:**
- ✅ Aplicación GoodForm
- ✅ Creación automática de tablas
- ⚠️ PostgreSQL externo requerido
- ⚠️ Node.js 18+ requerido

**El usuario debe:**
1. Tener PostgreSQL + Node.js instalados
2. Configurar DATABASE_URL en .env
3. Ejecutar `goodform start`
4. Visitar `http://localhost:5000/setup`

## 🔧 Cómo Funciona la Inicialización

### Script: `server/init-db.ts`

```typescript
// Al iniciar el servidor:
1. Conecta a PostgreSQL
2. Verifica si existe la tabla 'users'
3. Si NO existe:
   - Ejecuta SQL para crear TODAS las tablas
   - Inserta configuración por defecto
   - Crea deployment inicial (si es Auto-Host)
4. Si existe:
   - Solo verifica que todo esté bien
   - Continúa normalmente
```

### Logs del Usuario

Al instalar por primera vez verá:
```
🔍 Verificando esquema de base de datos...
📦 Base de datos vacía detectada. Creando tablas...
✅ Tablas creadas exitosamente
✅ Deployment inicial creado
✅ serving on port 5000
```

Al reiniciar posteriormente verá:
```
🔍 Verificando esquema de base de datos...
✅ Esquema de base de datos verificado
✅ serving on port 5000
```

## 🎯 Comparación de Opciones

| Aspecto | Docker Compose | Docker | NPM |
|---------|---------------|---------|-----|
| PostgreSQL incluido | ✅ Sí | ❌ No | ❌ No |
| Tablas auto-creadas | ✅ Sí | ✅ Sí | ✅ Sí |
| Complejidad setup | ⭐ Muy fácil | ⭐⭐ Media | ⭐⭐⭐ Avanzada |
| Requisitos previos | Solo Docker | Docker + PostgreSQL | Node.js + PostgreSQL |
| Mejor para | Producción | Integraciones | Desarrollo |
| Portabilidad | ⭐⭐⭐ Alta | ⭐⭐ Media | ⭐ Baja |

## 📝 Checklist de Instalación Exitosa

Para cualquier método, la instalación es exitosa cuando:

- [ ] El servidor inicia en puerto 5000
- [ ] Los logs muestran "✅ Esquema de base de datos verificado"
- [ ] Al visitar `http://localhost:5000/setup` aparece el wizard
- [ ] Puedes crear la cuenta de administrador
- [ ] Después de setup, redirecciona a `/auth`
- [ ] Puedes iniciar sesión con la cuenta creada

## 🚀 Recomendación para Distribución

Para **clientes no técnicos**, recomendamos:

### Docker Compose (⭐⭐⭐⭐⭐)

**Ventajas:**
- Cero configuración de PostgreSQL
- Un solo comando: `docker-compose up -d`
- Incluye backup automático con volúmenes
- Fácil de actualizar: `docker-compose pull && docker-compose up -d`

**Instrucciones para el cliente:**
```bash
# 1. Descargar
git clone https://tu-repo.com/goodform.git
cd goodform

# 2. Configurar (opcional - funciona con defaults)
cp .env.example .env
nano .env

# 3. Iniciar
docker-compose up -d

# 4. Abrir navegador
http://localhost:5000/setup
```

## 🔐 Variables de Entorno Importantes

```env
# Requeridas
DATABASE_URL=postgres://user:pass@host:5432/db
SESSION_SECRET=cambiar-en-produccion

# Configuración
DEPLOYMENT_MODE=self-hosted  # o 'saas'
PORT=5000

# Opcionales (Docker Compose)
DB_USER=goodform
DB_PASSWORD=tu-password-seguro
DB_NAME=goodform
```

## 📞 Soporte Post-Instalación

Si un cliente tiene problemas:

1. **Verificar logs:**
   ```bash
   docker-compose logs -f app
   ```

2. **Verificar PostgreSQL:**
   ```bash
   docker-compose exec db psql -U goodform -d goodform -c "\dt"
   ```

3. **Reiniciar limpio:**
   ```bash
   docker-compose down -v  # ⚠️ BORRA DATOS
   docker-compose up -d
   ```

## 🎉 Conclusión

**Sí, la instalación incluye TODO:**
- ✅ Aplicación completa
- ✅ Base de datos PostgreSQL (en Docker Compose)
- ✅ Creación automática de tablas
- ✅ Datos iniciales
- ✅ Configuración por defecto

El usuario solo necesita:
1. Instalar/ejecutar
2. Completar wizard de setup
3. ¡Empezar a usar!
