# GoodForm - Guía de Instalación

GoodForm se puede instalar de 3 formas diferentes según tus necesidades:

## 📦 Opción 1: Instalación con NPM (Recomendado para desarrollo)

### Requisitos previos
- Node.js 18+ y npm
- PostgreSQL 14+

### Pasos

1. **Instalar GoodForm globalmente:**
```bash
npm install -g goodform
```

2. **Crear directorio de trabajo:**
```bash
mkdir my-goodform
cd my-goodform
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
```

4. **Iniciar aplicación:**
```bash
goodform start
```

5. **Acceder al wizard de setup:**
- Abre http://localhost:5000/setup
- Crea tu cuenta de administrador
- ¡Listo!

---

## 🐳 Opción 2: Docker (Standalone)

### Requisitos previos
- Docker instalado
- PostgreSQL accesible (local o externo)

### Pasos

1. **Construir imagen:**
```bash
docker build -t goodform .
```

2. **Ejecutar contenedor:**
```bash
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/dbname" \
  -e SESSION_SECRET="your-secret-here" \
  -e DEPLOYMENT_MODE="self-hosted" \
  --name goodform \
  goodform
```

3. **Acceder al wizard:**
- http://localhost:5000/setup

---

## 🐳 Opción 3: Docker Compose (Recomendado para producción)

Esta opción incluye PostgreSQL automáticamente.

### Requisitos previos
- Docker y Docker Compose instalados

### Pasos

1. **Clonar o descargar GoodForm:**
```bash
git clone https://github.com/tu-usuario/goodform.git
cd goodform
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Edita .env con tus credenciales
```

3. **Iniciar servicios:**
```bash
docker-compose up -d
```

4. **Ver logs:**
```bash
docker-compose logs -f app
```

5. **Acceder al wizard:**
- http://localhost:5000/setup

### Comandos útiles:

```bash
# Detener servicios
docker-compose down

# Ver estado
docker-compose ps

# Reconstruir
docker-compose up -d --build

# Ver logs de base de datos
docker-compose logs -f db

# Acceder a la base de datos
docker-compose exec db psql -U goodform -d goodform
```

---

## 🔧 Configuración Post-Instalación

### 1. Completar Setup Inicial
- Visita `/setup` en tu instalación
- Crea la cuenta de administrador
- (Opcional) Ingresa código de licencia

### 2. Configurar SSL/HTTPS (Producción)
Para producción, usa un reverse proxy como Nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Backup de Base de Datos

```bash
# Con Docker Compose
docker-compose exec db pg_dump -U goodform goodform > backup.sql

# Restaurar
docker-compose exec -T db psql -U goodform goodform < backup.sql
```

---

## 🔑 Activación de Licencia

Si tienes un código de licencia:

1. Ingresa como administrador
2. Ve a **Configuración** > **Licencia**
3. Ingresa tu código de licencia
4. Guarda

Tu instalación ahora tiene acceso ilimitado a formularios.

---

## 🆘 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Revisa DATABASE_URL en .env
- Con Docker Compose: `docker-compose logs db`

### Error: "Port 5000 already in use"
- Cambia APP_PORT en .env
- O detén el servicio que usa el puerto 5000

### Forgot admin password
```bash
# Con Docker Compose
docker-compose exec db psql -U goodform goodform
# Luego en psql:
UPDATE users SET password = '<nuevo-hash>' WHERE email = 'admin@example.com';
```

---

## 📚 Recursos Adicionales

- Documentación completa: [docs.goodform.com](https://docs.goodform.com)
- Soporte: support@goodform.com
- Issues: [GitHub Issues](https://github.com/tu-usuario/goodform/issues)
