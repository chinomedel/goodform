// Based on blueprint:javascript_auth_all_persistance
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import {
  insertFormSchema,
  insertFormFieldSchema,
  insertFormPermissionSchema,
  insertFormResponseSchema,
  insertAppConfigSchema,
} from "@shared/schema";
import ExcelJS from 'exceljs';
import { isSelfHostedMode, hasValidLicense, isSetupCompleted, isSaasMode } from "./deployment";
import { hashPassword } from "./auth";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autenticado" });
  }
  next();
}

// Middleware to check if user has required role
function requireRole(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    const user = await storage.getUser(req.user.id);
    if (!user || (!user.isSuperAdmin && !roles.includes(user.roleId))) {
      return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
    }
    next();
  };
}

// Middleware to check if user is super admin
async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await storage.getUser(req.user.id);
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ message: "Solo el super administrador puede realizar esta acción" });
  }
  next();
}

// Helper to check if user is admin (deployment-specific)
function isAdmin(role: string): boolean {
  return role === 'admin_auto_host' || role === 'super_admin';
}

function isUserAdmin(user: any): boolean {
  return user.isSuperAdmin || isAdmin(user.roleId);
}

// Helper to check if user can create/edit forms (deployment-specific)
function canManageForms(role: string): boolean {
  if (isSelfHostedMode()) {
    return role === 'admin_auto_host';
  } else {
    return role === 'super_admin' || role === 'cliente_saas';
  }
}

// Middleware to check form limit in self-hosted mode
async function checkFormLimit(req: any, res: any, next: any) {
  if (isSelfHostedMode()) {
    const hasLicense = await hasValidLicense();
    
    if (!hasLicense) {
      const formCount = await storage.countForms();
      
      if (formCount >= 5) {
        return res.status(402).json({
          error: 'Límite de formularios alcanzado',
          message: 'Has alcanzado el límite de 5 formularios. Contacta al administrador para obtener una licencia.',
          limit: 5,
          current: formCount
        });
      }
    }
  }
  next();
}

// Helper to check if user can access form
async function canAccessForm(formId: string, userId: string): Promise<boolean> {
  const form = await storage.getForm(formId);
  if (!form) return false;

  const user = await storage.getUser(userId);
  if (!user) return false;

  // Admin can access everything
  if (isUserAdmin(user)) return true;

  // Creator can access their own forms
  if (form.creatorId === userId) return true;

  // Check if user has explicit permission
  const permission = await storage.getUserFormPermission(formId, userId);
  return !!permission;
}

// Helper to check if user can edit form
async function canEditForm(formId: string, userId: string): Promise<boolean> {
  const form = await storage.getForm(formId);
  if (!form) return false;

  const user = await storage.getUser(userId);
  if (!user) return false;

  // Admin can edit everything
  if (isUserAdmin(user)) return true;

  // Creator can edit their own forms
  if (form.creatorId === userId) return true;

  // Check if user has editor permission
  const permission = await storage.getUserFormPermission(formId, userId);
  return permission?.permission === 'editor';
}

export function registerRoutes(app: Express): Server {
  // Auth middleware and routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // User management (Admin only)
  app.get('/api/users', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user (Admin only, auto-host mode)
  app.post('/api/users', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      if (!isSelfHostedMode()) {
        return res.status(403).json({ message: "Creación de usuarios solo disponible en modo auto-host" });
      }

      const { email, password, firstName, lastName, roleId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos" });
      }

      const validRoles = isSelfHostedMode() 
        ? ['admin_auto_host', 'visualizador_auto_host']
        : ['super_admin', 'cliente_saas'];
      
      if (!roleId || !validRoles.includes(roleId)) {
        return res.status(400).json({ 
          message: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId,
        isSuperAdmin: false,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error al crear usuario" });
    }
  });

  app.patch('/api/users/:userId/role', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;

      const validRoles = isSelfHostedMode() 
        ? ['admin_auto_host', 'visualizador_auto_host']
        : ['super_admin', 'cliente_saas'];
      
      if (!validRoles.includes(roleId)) {
        return res.status(400).json({ message: "Rol inválido" });
      }

      const user = await storage.updateUserRole(userId, roleId);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Form routes
  app.post('/api/forms', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), checkFormLimit, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const formData = insertFormSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const form = await storage.createForm(formData);
      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(400).json({ message: "Failed to create form" });
    }
  });

  app.get('/api/forms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let forms;
      if (isUserAdmin(user)) {
        forms = await storage.getAllForms();
      } else {
        // Get user's own forms
        const ownForms = await storage.getFormsByUser(userId);
        
        // Get forms shared with user
        const sharedPermissions = await storage.getUserPermissions(userId);
        const sharedFormIds = sharedPermissions.map(p => p.formId);
        const sharedForms = await Promise.all(
          sharedFormIds.map(id => storage.getForm(id))
        );
        
        // Combine and deduplicate
        const allForms = [...ownForms, ...sharedForms.filter(f => f)];
        const uniqueForms = Array.from(
          new Map(allForms.map(f => [f!.id, f])).values()
        );
        forms = uniqueForms;
      }

      // Fetch response counts for each form
      const formsWithCounts = await Promise.all(
        forms.map(async (form) => {
          const responseCount = await storage.getFormResponseCount(form!.id);
          return { ...form, responseCount };
        })
      );

      res.json(formsWithCounts);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.get('/api/forms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check permission
      if (!await canAccessForm(id, userId)) {
        return res.status(403).json({ message: "Not authorized to access this form" });
      }

      const form = await storage.getFormWithFields(id);

      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      res.json(form);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.patch('/api/forms/:id', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user can edit
      if (!await canEditForm(id, userId)) {
        return res.status(403).json({ message: "Not authorized to edit this form" });
      }

      const updatedForm = await storage.updateForm(id, req.body);
      res.json(updatedForm);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete('/api/forms/:id', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const user = await storage.getUser(userId);
      
      // Only creator or admin can delete
      if (form.creatorId !== userId && (!user || !isUserAdmin(user))) {
        return res.status(403).json({ message: "Not authorized to delete this form" });
      }

      await storage.deleteForm(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  app.post('/api/forms/:id/publish', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user can edit
      if (!await canEditForm(id, userId)) {
        return res.status(403).json({ message: "Not authorized to publish this form" });
      }

      const publishedForm = await storage.publishForm(id);
      res.json(publishedForm);
    } catch (error) {
      console.error("Error publishing form:", error);
      res.status(500).json({ message: "Failed to publish form" });
    }
  });

  // Form field routes
  app.post('/api/forms/:formId/fields', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;

      // Check if user can edit
      if (!await canEditForm(formId, userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const fieldData = insertFormFieldSchema.parse({
        ...req.body,
        formId,
      });

      const field = await storage.createFormField(fieldData);
      res.json(field);
    } catch (error) {
      console.error("Error creating field:", error);
      res.status(400).json({ message: "Failed to create field" });
    }
  });

  app.post('/api/forms/:formId/fields/batch', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;
      const { fields } = req.body;

      // Check if user can edit
      if (!await canEditForm(formId, userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Validate all fields
      const validatedFields = fields.map((field: any) => 
        insertFormFieldSchema.parse({
          ...field,
          formId,
        })
      );

      // Delete existing fields and create new ones
      await storage.deleteFormFields(formId);

      const createdFields = [];
      for (const fieldData of validatedFields) {
        const field = await storage.createFormField(fieldData);
        createdFields.push(field);
      }

      res.json(createdFields);
    } catch (error) {
      console.error("Error updating fields:", error);
      res.status(400).json({ message: "Failed to update fields" });
    }
  });

  // Form permission routes
  app.post('/api/forms/:formId/permissions', isAuthenticated, requireRole('admin_auto_host', 'super_admin', 'cliente_saas'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const user = await storage.getUser(userId);
      
      // Only creator or admin can manage permissions
      if (form.creatorId !== userId && (!user || !isUserAdmin(user))) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const permissionData = insertFormPermissionSchema.parse({
        ...req.body,
        formId,
      });

      const permission = await storage.createFormPermission(permissionData);
      res.json(permission);
    } catch (error) {
      console.error("Error creating permission:", error);
      res.status(400).json({ message: "Failed to create permission" });
    }
  });

  app.get('/api/forms/:formId/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;

      // Check if user can access form
      if (!await canAccessForm(formId, userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const permissions = await storage.getFormPermissions(formId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Preview form (authenticated - for creators/admins)
  app.get('/api/forms/:id/preview', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const form = await storage.getFormWithFields(id);

      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Check if user can access form (creator, admin, or has permissions)
      if (!await canAccessForm(id, userId)) {
        return res.status(403).json({ message: "Not authorized to preview this form" });
      }

      // Return form data for preview (including custom code if in code mode)
      res.json({
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        builderMode: form.builderMode,
        customHtml: form.customHtml,
        customCss: form.customCss,
        customJs: form.customJs,
        status: form.status,
      });
    } catch (error) {
      console.error("Error fetching form preview:", error);
      res.status(500).json({ message: "Failed to fetch form preview" });
    }
  });

  // Public form submission (no auth required)
  app.get('/api/public/forms/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const form = await storage.getFormWithFields(id);

      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.status !== 'published') {
        return res.status(404).json({ message: "Form not available" });
      }

      // Check if form is public
      if (form.shareType !== 'public') {
        return res.status(404).json({ message: "Form not available" });
      }

      // Only return necessary data for public forms
      res.json({
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        shareType: form.shareType,
        builderMode: form.builderMode,
        customHtml: form.customHtml,
        customCss: form.customCss,
        customJs: form.customJs,
        submitButtonText: form.submitButtonText,
        submitButtonColor: form.submitButtonColor,
        urlParams: form.urlParams,
      });
    } catch (error) {
      console.error("Error fetching public form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post('/api/public/forms/:id/submit', async (req, res) => {
    try {
      const { id } = req.params;
      const { answers, email, urlParams } = req.body;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.status !== 'published') {
        return res.status(404).json({ message: "Form not available" });
      }

      // Check if form is public
      if (form.shareType !== 'public') {
        return res.status(404).json({ message: "Form not available" });
      }

      const responseData = insertFormResponseSchema.parse({
        formId: id,
        respondentEmail: email,
        answers,
        urlParams: urlParams || null,
      });

      const response = await storage.createFormResponse(responseData);
      res.json(response);
    } catch (error) {
      console.error("Error submitting response:", error);
      res.status(400).json({ message: "Failed to submit response" });
    }
  });

  // Form responses
  app.get('/api/forms/:formId/responses', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;

      // Check if user can access form
      if (!await canAccessForm(formId, userId)) {
        return res.status(403).json({ message: "Not authorized to access responses" });
      }

      const responses = await storage.getFormResponses(formId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  // Export to Excel
  app.get('/api/forms/:formId/export', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.id;
      
      // Check if user can access form
      if (!await canAccessForm(formId, userId)) {
        return res.status(403).json({ message: "Not authorized to export responses" });
      }

      const form = await storage.getFormWithFields(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const responses = await storage.getFormResponses(formId);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Respuestas');

      // Add headers
      const headers = ['ID', 'Fecha de Envío', 'Email'];
      form.fields.forEach(field => {
        headers.push(field.label);
      });
      worksheet.addRow(headers);

      // Add data
      responses.forEach(response => {
        const row = [
          response.id,
          response.submittedAt?.toISOString() || '',
          response.respondentEmail || '',
        ];
        
        const answers = response.answers as Record<string, any>;
        form.fields.forEach(field => {
          row.push(answers[field.id] || '');
        });
        
        worksheet.addRow(row);
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, '_')}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getFormStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Setup wizard for self-hosted (no auth required)
  app.post('/api/setup', async (req: any, res) => {
    try {
      if (isSaasMode()) {
        return res.status(403).json({ message: "Setup no disponible en modo SaaS" });
      }

      const setupComplete = await isSetupCompleted();
      if (setupComplete) {
        return res.status(403).json({ message: "Setup ya completado" });
      }

      const { email, password, firstName, lastName, licenseKey } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son requeridos" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId: 'admin_auto_host',
        isSuperAdmin: false,
      });

      let deployment = await storage.getDeployment();
      if (!deployment) {
        deployment = await storage.createDeployment({
          mode: 'self-hosted',
          setupCompleted: true,
          licenseKey: licenseKey || undefined,
        });
      } else {
        deployment = await storage.updateDeployment(deployment.id, {
          setupCompleted: true,
          licenseKey: licenseKey || undefined,
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, deployment });
    } catch (error) {
      console.error("Error in setup:", error);
      res.status(500).json({ message: "Error al completar setup" });
    }
  });

  // Check if setup is needed
  app.get('/api/setup/status', async (req: any, res) => {
    try {
      const setupComplete = await isSetupCompleted();
      const mode = isSelfHostedMode() ? 'self-hosted' : 'saas';
      res.json({ setupCompleted: setupComplete, mode });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ message: "Error al verificar estado de setup" });
    }
  });

  // License validation endpoint (for self-hosted to validate against SaaS)
  app.post('/api/license/validate', async (req: any, res) => {
    try {
      if (!isSaasMode()) {
        return res.status(403).json({ message: "Este endpoint solo está disponible en modo SaaS" });
      }

      const { licenseKey } = req.body;

      if (!licenseKey) {
        return res.status(400).json({ message: "License key es requerida" });
      }

      const license = await storage.getLicense(licenseKey);

      if (!license) {
        return res.json({ valid: false, message: "Licencia no encontrada" });
      }

      if (license.status !== 'active') {
        return res.json({ valid: false, message: "Licencia inactiva" });
      }

      const now = new Date();
      if (license.expiresAt < now) {
        return res.json({ valid: false, message: "Licencia expirada" });
      }

      res.json({
        valid: true,
        expiresAt: license.expiresAt,
      });
    } catch (error) {
      console.error("Error validating license:", error);
      res.status(500).json({ message: "Error al validar licencia" });
    }
  });

  // License status for self-hosted
  app.get('/api/license/status', isAuthenticated, async (req: any, res) => {
    try {
      if (isSaasMode()) {
        return res.json({
          valid: true,
          mode: 'saas',
          formCount: 0,
          formLimit: -1,
        });
      }

      const hasLicense = await hasValidLicense();
      const deployment = await storage.getDeployment();
      const formCount = await storage.countForms();

      res.json({
        valid: hasLicense,
        mode: 'self-hosted',
        expiresAt: deployment?.validUntil || null,
        formCount,
        formLimit: hasLicense ? -1 : 5,
      });
    } catch (error) {
      console.error("Error fetching license status:", error);
      res.status(500).json({ message: "Error al obtener estado de licencia" });
    }
  });

  // Activate license (self-hosted)
  app.post('/api/license/activate', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      if (isSaasMode()) {
        return res.status(403).json({ message: "No disponible en modo SaaS" });
      }

      const { licenseKey } = req.body;

      if (!licenseKey) {
        return res.status(400).json({ message: "License key es requerida" });
      }

      const deployment = await storage.getDeployment();
      if (!deployment) {
        return res.status(500).json({ message: "Deployment no encontrado" });
      }

      await storage.updateDeployment(deployment.id, {
        licenseKey,
        lastValidated: new Date(),
      });

      res.json({ success: true, message: "Licencia activada" });
    } catch (error) {
      console.error("Error activating license:", error);
      res.status(500).json({ message: "Error al activar licencia" });
    }
  });

  // License management (Super Admin only - SaaS mode)
  app.post('/api/admin/licenses/issue', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      if (!isSaasMode()) {
        return res.status(403).json({ message: "Solo disponible en modo SaaS" });
      }

      const { issuedToEmail, expiresAt, deploymentInfo } = req.body;

      if (!issuedToEmail || !expiresAt) {
        return res.status(400).json({ message: "Email y fecha de expiración son requeridos" });
      }

      const licenseKey = `GF-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const license = await storage.createLicense({
        licenseKey,
        issuedToEmail,
        issuedBy: req.user.email,
        expiresAt: new Date(expiresAt),
        status: 'active',
        deploymentInfo: deploymentInfo || null,
      });

      res.status(201).json(license);
    } catch (error) {
      console.error("Error issuing license:", error);
      res.status(500).json({ message: "Error al emitir licencia" });
    }
  });

  app.get('/api/admin/licenses', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      if (!isSaasMode()) {
        return res.status(403).json({ message: "Solo disponible en modo SaaS" });
      }

      const licenses = await storage.getAllLicenses();
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Error al obtener licencias" });
    }
  });

  app.patch('/api/admin/licenses/:id/revoke', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      if (!isSaasMode()) {
        return res.status(403).json({ message: "Solo disponible en modo SaaS" });
      }

      const { id } = req.params;
      const license = await storage.updateLicenseStatus(id, 'revoked');
      res.json(license);
    } catch (error) {
      console.error("Error revoking license:", error);
      res.status(500).json({ message: "Error al revocar licencia" });
    }
  });

  // App configuration (Admin only)
  app.get('/api/config', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const config = await storage.getAppConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.patch('/api/config', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const configData = insertAppConfigSchema.parse(req.body);
      const updatedConfig = await storage.updateAppConfig(configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(400).json({ message: "Failed to update configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
