#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const command = args[0] || 'start';

const commands = {
  start: () => {
    console.log('🚀 Iniciando GoodForm...\n');
    const serverPath = join(__dirname, '..', 'dist', 'index.js');
    const server = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE || 'self-hosted',
      },
    });

    server.on('error', (err) => {
      console.error('❌ Error al iniciar el servidor:', err.message);
      process.exit(1);
    });

    server.on('close', (code) => {
      process.exit(code || 0);
    });
  },

  setup: () => {
    console.log('📋 Configuración de GoodForm\n');
    console.log('Visita http://localhost:5000/setup en tu navegador para completar la configuración inicial.\n');
    commands.start();
  },

  help: () => {
    console.log(`
GoodForm - Plataforma de Gestión de Formularios

Uso: goodform <comando>

Comandos disponibles:
  start      Inicia el servidor GoodForm (por defecto)
  setup      Inicia el servidor y muestra instrucciones de setup
  help       Muestra esta ayuda

Variables de entorno importantes:
  DATABASE_URL        URL de conexión a PostgreSQL
  SESSION_SECRET      Secret para sesiones (requerido)
  DEPLOYMENT_MODE     Modo de deployment (self-hosted por defecto)
  PORT                Puerto del servidor (5000 por defecto)

Ejemplos:
  goodform start
  goodform setup
  PORT=3000 goodform start

Documentación completa: https://docs.goodform.com
    `);
  },
};

const handler = commands[command] || commands.help;
handler();
