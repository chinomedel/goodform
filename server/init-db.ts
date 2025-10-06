import { db } from './db';
import { log } from './vite';
import { roles, appConfig } from '@shared/schema';

/**
 * Inicializa la base de datos poblando datos iniciales
 * Las tablas son creadas automáticamente por Drizzle (npm run db:push)
 * Se ejecuta automáticamente en el startup del servidor
 */
export async function initializeDatabase() {
  try {
    log('🔍 Verificando esquema de base de datos...');

    // Poblar tabla de roles si está vacía
    const existingRoles = await db.select().from(roles);

    if (existingRoles.length === 0) {
      log('📦 Poblando tabla de roles...');
      
      await db.insert(roles).values([
        {
          id: 'super_admin',
          name: 'Super Admin',
          description: 'Administrador con acceso total al sistema SaaS',
        },
        {
          id: 'admin_auto_host',
          name: 'Administrador Auto-Host',
          description: 'Administrador de instalación auto-hospedada',
        },
        {
          id: 'visualizador_auto_host',
          name: 'Visualizador Auto-Host',
          description: 'Usuario con permisos de visualización en auto-host',
        },
        {
          id: 'cliente_saas',
          name: 'Cliente SaaS',
          description: 'Cliente del servicio SaaS con permisos completos',
        },
      ]);

      log('✅ Roles creados exitosamente');
    }

    // Poblar configuración si no existe
    const existingConfig = await db.select().from(appConfig);

    if (existingConfig.length === 0) {
      log('📦 Creando configuración inicial...');
      
      await db.insert(appConfig).values({
        id: 'default',
        appName: 'GoodForm',
        primaryColor: '#6366f1',
      });

      log('✅ Configuración inicial creada');
    }

    log('✅ Esquema de base de datos verificado');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}
