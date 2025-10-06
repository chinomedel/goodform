# Preparar GoodForm para Distribución NPM

Si deseas publicar GoodForm en el registro de NPM para que otros puedan instalarlo con `npm install -g goodform`, sigue estos pasos:

## 1. Actualizar package.json

Reemplaza el contenido de `package.json` con esta configuración:

```json
{
  "name": "goodform",
  "version": "1.0.0",
  "description": "Plataforma de gestión de formularios con constructor drag-and-drop, analytics y sistema de roles",
  "type": "module",
  "license": "MIT",
  "author": "Tu Nombre <tu@email.com>",
  "homepage": "https://goodform.com",
  "repository": {
    "type": "git",
    "url": "https://github.com/tu-usuario/goodform.git"
  },
  "bugs": {
    "url": "https://github.com/tu-usuario/goodform/issues"
  },
  "keywords": [
    "forms",
    "form-builder",
    "survey",
    "questionnaire",
    "analytics",
    "postgresql",
    "react",
    "typescript"
  ],
  "bin": {
    "goodform": "./bin/goodform.js"
  },
  "files": [
    "dist/",
    "server/",
    "shared/",
    "bin/",
    "drizzle.config.ts",
    "INSTALL.md",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "prepublishOnly": "npm run build && npm run check"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@tanstack/react-query": "^5.60.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "exceljs": "^4.4.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "lucide-react": "^0.453.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "tailwind-merge": "^2.6.0",
    "wouter": "^3.3.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/react": "^18.3.11",
    "@vitejs/plugin-react": "^4.7.0",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.20.5",
    "typescript": "5.6.3",
    "vite": "^5.4.20"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## 2. Crear archivo .npmignore

```
node_modules
.env
.env.*
*.log
.git
.vscode
.idea
.DS_Store
coverage
.replit
replit.nix
client/src
client/public
*.test.js
*.test.ts
test/
tests/
```

## 3. Asegurar que bin/goodform.js sea ejecutable

```bash
chmod +x bin/goodform.js
```

## 4. Probar localmente antes de publicar

```bash
# Construir el proyecto
npm run build

# Probar instalación local
npm link

# En otro directorio, probar el comando
goodform --help

# Desinstalar test
npm unlink -g goodform
```

## 5. Publicar en NPM

### Primera vez:

```bash
# Login en NPM
npm login

# Verificar contenido del paquete
npm pack --dry-run

# Publicar
npm publish
```

### Actualizaciones:

```bash
# Incrementar versión (patch/minor/major)
npm version patch

# Publicar nueva versión
npm publish
```

## 6. Habilitar 2FA en NPM (Recomendado)

```bash
npm profile enable-2fa auth-and-writes
```

## 7. Uso después de publicar

Los usuarios podrán instalar con:

```bash
npm install -g goodform
goodform setup
```

## Notas Importantes

- **Nombre del paquete**: Si "goodform" ya está tomado, usa un scope: `@tu-usuario/goodform`
- **Versión**: Sigue [Semantic Versioning](https://semver.org/)
- **Licencia**: Asegúrate de incluir archivo LICENSE
- **README**: Crea un README.md completo con instrucciones
- **Seguridad**: NUNCA incluyas .env o secretos en el paquete

## Alternativa: NPX (Sin instalación global)

Los usuarios también podrán ejecutar sin instalar:

```bash
npx goodform setup
```

## CI/CD Automatizado (Opcional)

Crea `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
