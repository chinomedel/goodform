import { sql } from 'drizzle-orm';
import { db } from './db';
import { log } from './vite';

/**
 * Inicializa la base de datos creando las tablas si no existen
 * Se ejecuta automáticamente en el startup del servidor
 */
export async function initializeDatabase() {
  try {
    log('🔍 Verificando esquema de base de datos...');

    // Verificar si las tablas existen
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    const tablesExist = result.rows.length > 0;

    if (!tablesExist) {
      log('📦 Base de datos vacía detectada. Creando tablas...');
      
      // Ejecutar el schema completo
      await db.execute(sql`
        -- Crear tabla de usuarios
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password TEXT NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          role VARCHAR(50) NOT NULL DEFAULT 'gestor',
          "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de deployments
        CREATE TABLE IF NOT EXISTS deployments (
          id VARCHAR(255) PRIMARY KEY,
          "isSetupComplete" BOOLEAN NOT NULL DEFAULT false,
          "licenseKey" VARCHAR(255),
          "lastLicenseCheck" TIMESTAMP,
          "licenseValid" BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de licenses
        CREATE TABLE IF NOT EXISTS licenses (
          id SERIAL PRIMARY KEY,
          "licenseKey" VARCHAR(255) NOT NULL UNIQUE,
          "issuedToEmail" VARCHAR(255) NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de formularios
        CREATE TABLE IF NOT EXISTS forms (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          "ownerId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de campos de formularios
        CREATE TABLE IF NOT EXISTS form_fields (
          id SERIAL PRIMARY KEY,
          "formId" INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          label VARCHAR(255) NOT NULL,
          required BOOLEAN NOT NULL DEFAULT false,
          options TEXT[],
          "order" INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de respuestas
        CREATE TABLE IF NOT EXISTS form_responses (
          id SERIAL PRIMARY KEY,
          "formId" INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
          "respondentEmail" VARCHAR(255),
          "respondentName" VARCHAR(255),
          answers JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear tabla de permisos
        CREATE TABLE IF NOT EXISTS form_permissions (
          id SERIAL PRIMARY KEY,
          "formId" INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          permission VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("formId", "userId")
        );

        -- Crear tabla de sesiones
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

        -- Crear tabla de configuración
        CREATE TABLE IF NOT EXISTS app_config (
          id VARCHAR(255) PRIMARY KEY DEFAULT 'default',
          "appName" VARCHAR(255),
          "logoUrl" VARCHAR(255),
          "faviconUrl" VARCHAR(255),
          "primaryColor" VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Insertar configuración por defecto
        INSERT INTO app_config (id, "appName") 
        VALUES ('default', 'GoodForm') 
        ON CONFLICT (id) DO NOTHING;
      `);

      log('✅ Tablas creadas exitosamente');

      // Solo crear datos iniciales si acabamos de crear las tablas
      // Verificar/crear deployment para self-hosted
      if (process.env.DEPLOYMENT_MODE === 'self-hosted') {
        await db.execute(sql`
          INSERT INTO deployments (id, "isSetupComplete", "licenseValid")
          VALUES ('default', false, false)
          ON CONFLICT (id) DO NOTHING
        `);
        log('✅ Deployment inicial creado');
      }
    } else {
      log('✅ Esquema de base de datos verificado');
    }

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}
