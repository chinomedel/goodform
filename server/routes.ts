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
  insertChartSchema,
} from "@shared/schema";
import ExcelJS from 'exceljs';
import { isSelfHostedMode, hasValidLicense, isSetupCompleted, isSaasMode } from "./deployment";
import { hashPassword } from "./auth";
import { sendEmail, generatePasswordResetEmail } from "./email-utils";
import crypto from 'crypto';
import {
  agentTools,
  executeAnalyzeResponses,
  executeCreateChart,
  executeUpdateChart,
  executeDeleteChart,
  executeGetExistingCharts,
  executeGetFormFields,
} from "./ai-tools";

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

  // Password Reset - Forgot Password (Public)
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email es requerido" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ 
          success: true, 
          message: "Si el email existe, recibirás un enlace para restablecer tu contraseña" 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // Get app config for app name
      const config = await storage.getAppConfig();
      const appName = config.appName || 'GoodForm';

      // Generate reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      // Generate email content
      const { html, text } = generatePasswordResetEmail(resetLink, appName);

      // Send email
      const emailSent = await sendEmail({
        to: email,
        subject: `Restablecer contraseña - ${appName}`,
        html,
        text,
      });

      if (!emailSent) {
        console.error('Failed to send password reset email');
        return res.status(500).json({ 
          success: false,
          message: "Error al enviar el email. Por favor, contacta al administrador." 
        });
      }

      res.json({ 
        success: true, 
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña" 
      });
    } catch (error) {
      console.error('Error in forgot-password:', error);
      res.status(500).json({ 
        success: false,
        message: "Error al procesar la solicitud" 
      });
    }
  });

  // Password Reset - Validate Token (Public)
  app.get('/api/auth/validate-reset-token', async (req: any, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: "Token inválido" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.json({ valid: false, message: "El enlace es inválido o ha expirado" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(500).json({ valid: false, message: "Error al validar el token" });
    }
  });

  // Password Reset - Reset Password (Public)
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ 
          success: false,
          message: "Token y nueva contraseña son requeridos" 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres" 
        });
      }

      // Validate token
      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ 
          success: false,
          message: "El enlace es inválido o ha expirado" 
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await storage.markTokenAsUsed(token);

      // Clean up expired tokens
      await storage.deleteExpiredTokens();

      res.json({ 
        success: true,
        message: "Contraseña actualizada correctamente" 
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ 
        success: false,
        message: "Error al restablecer la contraseña" 
      });
    }
  });

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

  app.patch('/api/users/:userId/status', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isDeleted, blockReason } = req.body;

      const updateData: { isDeleted?: boolean; blockReason?: 'non_payment' | 'login_attempts' | 'general' | null; blockedAt?: Date | null } = {};

      if (typeof isDeleted === 'boolean') {
        updateData.isDeleted = isDeleted;
      }

      if (blockReason !== undefined) {
        updateData.blockReason = blockReason;
        updateData.blockedAt = blockReason ? new Date() : null;
      }

      const user = await storage.updateUserStatus(userId, updateData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Error al actualizar el estado del usuario" });
    }
  });

  app.patch('/api/users/:userId/name', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName } = req.body;

      const updateData: { firstName?: string; lastName?: string } = {};

      if (firstName !== undefined) {
        updateData.firstName = firstName;
      }

      if (lastName !== undefined) {
        updateData.lastName = lastName;
      }

      const user = await storage.updateUserName(userId, updateData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user name:", error);
      res.status(500).json({ message: "Error al actualizar el nombre del usuario" });
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

      // Check publication date range
      const now = new Date();
      if (form.publishStartDate && now < new Date(form.publishStartDate)) {
        return res.status(404).json({ 
          message: "Este formulario aún no está disponible",
          availableFrom: form.publishStartDate 
        });
      }
      if (form.publishEndDate && now > new Date(form.publishEndDate)) {
        return res.status(404).json({ 
          message: "Este formulario ya no está disponible",
          availableUntil: form.publishEndDate 
        });
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

      // Check publication date range
      const now = new Date();
      if (form.publishStartDate && now < new Date(form.publishStartDate)) {
        return res.status(404).json({ 
          message: "Este formulario aún no está disponible",
          availableFrom: form.publishStartDate 
        });
      }
      if (form.publishEndDate && now > new Date(form.publishEndDate)) {
        return res.status(404).json({ 
          message: "Este formulario ya no está disponible",
          availableUntil: form.publishEndDate 
        });
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

  // Public configuration (no authentication required)
  app.get('/api/public-config', async (req: any, res) => {
    try {
      const config = await storage.getAppConfig();
      // Only return public fields
      res.json({
        appName: config.appName,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        primaryColor: config.primaryColor,
      });
    } catch (error) {
      console.error("Error fetching public config:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
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

  // AI Configuration endpoints
  app.get('/api/ai-config', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const config = await storage.getAiConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching AI config:", error);
      res.status(500).json({ message: "Error al obtener configuración de IA" });
    }
  });

  app.patch('/api/ai-config', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { activeProvider } = req.body;
      
      if (!activeProvider || !['openai', 'deepseek'].includes(activeProvider)) {
        return res.status(400).json({ message: "Proveedor de IA inválido" });
      }

      const updatedConfig = await storage.updateAiConfig({ activeProvider });
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating AI config:", error);
      res.status(500).json({ message: "Error al actualizar configuración de IA" });
    }
  });

  app.get('/api/ai-config/keys-status', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const config = await storage.getAiConfig();
      res.json({
        openai: !!config.openaiApiKey || !!process.env.OPENAI_API_KEY,
        deepseek: !!config.deepseekApiKey || !!process.env.DEEPSEEK_API_KEY
      });
    } catch (error) {
      console.error("Error checking API keys status:", error);
      res.status(500).json({ message: "Error al verificar estado de API keys" });
    }
  });

  app.post('/api/ai-config/update-keys', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { openaiApiKey, deepseekApiKey } = req.body;
      
      await storage.updateAiApiKeys(openaiApiKey, deepseekApiKey);
      
      res.json({ 
        success: true, 
        message: "API keys actualizadas correctamente" 
      });
    } catch (error: any) {
      console.error("Error updating API keys:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error al actualizar API keys: ${error.message}` 
      });
    }
  });

  app.post('/api/ai-config/test/:provider', isAuthenticated, requireRole('admin_auto_host', 'super_admin'), async (req: any, res) => {
    try {
      const { provider } = req.params;
      const keys = await storage.getDecryptedApiKeys();

      if (provider === 'openai') {
        const apiKey = keys.openai || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ 
            success: false, 
            message: "OPENAI_API_KEY no está configurada" 
          });
        }

        try {
          // Test connection with a simple completion
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey });
          
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Responde solo con 'OK'" }],
            max_tokens: 10,
          });

          const testResult = response.choices[0]?.message?.content;
          return res.json({ 
            success: true, 
            message: "Conexión exitosa con OpenAI",
            details: `Respuesta del modelo: ${testResult}`
          });
        } catch (error: any) {
          return res.status(500).json({ 
            success: false, 
            message: `Error al conectar con OpenAI: ${error.message}` 
          });
        }
      } else if (provider === 'deepseek') {
        const apiKey = keys.deepseek || process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ 
            success: false, 
            message: "DEEPSEEK_API_KEY no está configurada" 
          });
        }

        try {
          // Test connection with Deepseek API (compatible with OpenAI format)
          const OpenAI = (await import('openai')).default;
          const deepseek = new OpenAI({ 
            apiKey,
            baseURL: 'https://api.deepseek.com/v1'
          });
          
          const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: "Responde solo con 'OK'" }],
            max_tokens: 10,
          });

          const testResult = response.choices[0]?.message?.content;
          return res.json({ 
            success: true, 
            message: "Conexión exitosa con Deepseek",
            details: `Respuesta del modelo: ${testResult}`
          });
        } catch (error: any) {
          return res.status(500).json({ 
            success: false, 
            message: `Error al conectar con Deepseek: ${error.message}` 
          });
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Proveedor no soportado" 
        });
      }
    } catch (error: any) {
      console.error("Error testing AI provider:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error al probar conexión: ${error.message}` 
      });
    }
  });

  // SMTP Configuration endpoints (Super Admin and Admin Auto-host only)
  app.get('/api/smtp-config', isAuthenticated, requireRole('super_admin', 'admin_auto_host'), async (req: any, res) => {
    try {
      const config = await storage.getSmtpConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching SMTP config:", error);
      res.status(500).json({ message: "Error al obtener configuración SMTP" });
    }
  });

  app.patch('/api/smtp-config', isAuthenticated, requireRole('super_admin', 'admin_auto_host'), async (req: any, res) => {
    try {
      const { host, port, secure, fromEmail, fromName } = req.body;
      
      const updateData: any = {};
      if (host !== undefined) updateData.host = host;
      if (port !== undefined) updateData.port = port;
      if (secure !== undefined) updateData.secure = secure;
      if (fromEmail !== undefined) updateData.fromEmail = fromEmail;
      if (fromName !== undefined) updateData.fromName = fromName;

      const updatedConfig = await storage.updateSmtpConfig(updateData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating SMTP config:", error);
      res.status(500).json({ message: "Error al actualizar configuración SMTP" });
    }
  });

  app.post('/api/smtp-config/update-credentials', isAuthenticated, requireRole('super_admin', 'admin_auto_host'), async (req: any, res) => {
    try {
      const { user, password } = req.body;
      
      await storage.updateSmtpCredentials(user, password);
      
      res.json({ 
        success: true, 
        message: "Credenciales SMTP actualizadas correctamente" 
      });
    } catch (error: any) {
      console.error("Error updating SMTP credentials:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error al actualizar credenciales SMTP: ${error.message}` 
      });
    }
  });

  app.get('/api/smtp-config/credentials-status', isAuthenticated, requireRole('super_admin', 'admin_auto_host'), async (req: any, res) => {
    try {
      const config = await storage.getSmtpConfig();
      res.json({
        hasUser: !!config.user,
        hasPassword: !!config.password
      });
    } catch (error) {
      console.error("Error checking SMTP credentials status:", error);
      res.status(500).json({ message: "Error al verificar estado de credenciales SMTP" });
    }
  });

  app.post('/api/smtp-config/test', isAuthenticated, requireRole('super_admin', 'admin_auto_host'), async (req: any, res) => {
    try {
      const config = await storage.getSmtpConfig();
      const credentials = await storage.getDecryptedSmtpCredentials();

      if (!config.host || !config.fromEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Configuración SMTP incompleta. Se requiere host y email" 
        });
      }

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: credentials.user && credentials.password ? {
          user: credentials.user,
          pass: credentials.password
        } : undefined
      });

      await transporter.verify();

      res.json({ 
        success: true, 
        message: "Conexión SMTP exitosa" 
      });
    } catch (error: any) {
      console.error("Error testing SMTP connection:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error al probar conexión SMTP: ${error.message}` 
      });
    }
  });

  // Chart endpoints
  app.post('/api/forms/:formId/charts', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      if (form.creatorId !== req.user.id) {
        const permission = await storage.getUserFormPermission(formId, req.user.id);
        if (!permission || permission.permission !== 'editor') {
          return res.status(403).json({ message: "No tienes permisos para crear gráficos en este formulario" });
        }
      }

      const chartData = insertChartSchema.parse({ ...req.body, formId });
      const chart = await storage.createChart(chartData);
      res.json(chart);
    } catch (error) {
      console.error("Error creating chart:", error);
      res.status(400).json({ message: "Error al crear gráfico" });
    }
  });

  app.get('/api/forms/:formId/charts', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      if (form.creatorId !== req.user.id) {
        const permission = await storage.getUserFormPermission(formId, req.user.id);
        if (!permission) {
          return res.status(403).json({ message: "No tienes permisos para ver este formulario" });
        }
      }

      const charts = await storage.getFormCharts(formId);
      res.json(charts);
    } catch (error) {
      console.error("Error fetching charts:", error);
      res.status(500).json({ message: "Error al obtener gráficos" });
    }
  });

  app.patch('/api/charts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const chart = await storage.getChart(id);
      
      if (!chart) {
        return res.status(404).json({ message: "Gráfico no encontrado" });
      }

      const form = await storage.getForm(chart.formId);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      if (form.creatorId !== req.user.id) {
        const permission = await storage.getUserFormPermission(chart.formId, req.user.id);
        if (!permission || permission.permission !== 'editor') {
          return res.status(403).json({ message: "No tienes permisos para editar este gráfico" });
        }
      }

      const updatedChart = await storage.updateChart(id, req.body);
      res.json(updatedChart);
    } catch (error) {
      console.error("Error updating chart:", error);
      res.status(400).json({ message: "Error al actualizar gráfico" });
    }
  });

  app.delete('/api/charts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const chart = await storage.getChart(id);
      
      if (!chart) {
        return res.status(404).json({ message: "Gráfico no encontrado" });
      }

      const form = await storage.getForm(chart.formId);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      if (form.creatorId !== req.user.id) {
        const permission = await storage.getUserFormPermission(chart.formId, req.user.id);
        if (!permission || permission.permission !== 'editor') {
          return res.status(403).json({ message: "No tienes permisos para eliminar este gráfico" });
        }
      }

      await storage.deleteChart(id);
      res.json({ message: "Gráfico eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting chart:", error);
      res.status(500).json({ message: "Error al eliminar gráfico" });
    }
  });

  // Chat Agent endpoint
  app.post('/api/forms/:formId/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Se requiere un mensaje" });
      }

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      // Verificar permisos de acceso
      let hasEditPermission = false;
      if (form.creatorId === req.user.id) {
        hasEditPermission = true;
      } else {
        const permission = await storage.getUserFormPermission(formId, req.user.id);
        if (!permission) {
          return res.status(403).json({ message: "No tienes permisos para acceder a este formulario" });
        }
        hasEditPermission = permission.permission === 'editor';
      }

      // Obtener configuración de AI
      const aiConfig = await storage.getAiConfig();
      const apiKeys = await storage.getDecryptedApiKeys();
      const apiKey = aiConfig.activeProvider === 'openai' ? apiKeys.openai : apiKeys.deepseek;

      if (!apiKey) {
        return res.status(500).json({ 
          message: `No hay API key configurada para ${aiConfig.activeProvider}` 
        });
      }

      // Obtener contexto del formulario
      const fields = await executeGetFormFields(formId);
      const existingCharts = await executeGetExistingCharts(formId);
      const responses = await storage.getFormResponses(formId);

      const systemMessage = `Eres un asistente de análisis de datos para formularios. 
Tienes acceso a las siguientes herramientas para ayudar al usuario:
- analyze_responses: Para calcular estadísticas y analizar datos
- create_chart: Para crear nuevos gráficos
- update_chart: Para modificar gráficos existentes
- delete_chart: Para eliminar gráficos
- get_existing_charts: Para ver qué gráficos ya existen
- get_form_fields: Para ver qué campos tiene el formulario

Contexto del formulario:
- Nombre: ${form.title}
- Total de respuestas: ${responses.length}
- Campos disponibles: ${JSON.stringify(fields)}
- Gráficos existentes: ${JSON.stringify(existingCharts)}

Cuando el usuario te pida crear o modificar gráficos, usa las herramientas disponibles.
Responde en español de manera clara y concisa.`;

      let aiResponse: any;
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      if (aiConfig.activeProvider === 'openai') {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey });

        const messages = [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as any,
          tools: agentTools as any,
          tool_choice: 'auto',
        });

        aiResponse = completion.choices[0].message;

        // Registrar uso de tokens
        if (completion.usage) {
          const inputPrice = aiConfig.openaiInputPrice || 15;
          const outputPrice = aiConfig.openaiOutputPrice || 60;
          const inputCost = Math.round((completion.usage.prompt_tokens / 1000000) * inputPrice);
          const outputCost = Math.round((completion.usage.completion_tokens / 1000000) * outputPrice);
          const estimatedCost = inputCost + outputCost;
          await storage.createAiUsageLog({
            provider: 'openai',
            model: 'gpt-4o-mini',
            formId,
            userId: req.user.id,
            promptTokens: completion.usage.prompt_tokens || 0,
            completionTokens: completion.usage.completion_tokens || 0,
            totalTokens: completion.usage.total_tokens || 0,
            estimatedCost,
          });
        }

        // Ejecutar tool calls si existen
        if (aiResponse.tool_calls) {
          toolCalls = aiResponse.tool_calls;
          
          for (const toolCall of aiResponse.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let result: any;

            switch (functionName) {
              case 'analyze_responses':
                result = await executeAnalyzeResponses(
                  formId,
                  functionArgs.field,
                  functionArgs.operation,
                  functionArgs.groupBy
                );
                break;
              case 'create_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para crear gráficos" };
                } else {
                  result = await executeCreateChart(
                    formId,
                    functionArgs.title,
                    functionArgs.chartType,
                    functionArgs.xAxisField,
                    functionArgs.aggregationType,
                    functionArgs.yAxisField
                  );
                }
                break;
              case 'update_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para modificar gráficos" };
                } else {
                  result = await executeUpdateChart(
                    functionArgs.chartId,
                    {
                      title: functionArgs.title,
                      chartType: functionArgs.chartType,
                      xAxisField: functionArgs.xAxisField,
                      yAxisField: functionArgs.yAxisField,
                      aggregationType: functionArgs.aggregationType,
                    }
                  );
                }
                break;
              case 'delete_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para eliminar gráficos" };
                } else {
                  result = await executeDeleteChart(functionArgs.chartId);
                }
                break;
              case 'get_existing_charts':
                result = await executeGetExistingCharts(formId);
                break;
              case 'get_form_fields':
                result = await executeGetFormFields(formId);
                break;
              default:
                result = { error: `Función desconocida: ${functionName}` };
            }

            toolResults.push({
              tool_call_id: toolCall.id,
              function_name: functionName,
              result,
            });
          }

          // Segunda llamada con los resultados de las herramientas
          const secondCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              ...messages,
              aiResponse,
              ...toolResults.map((tr) => ({
                role: 'tool' as const,
                tool_call_id: tr.tool_call_id,
                content: JSON.stringify(tr.result),
              })),
            ] as any,
          });

          aiResponse = secondCompletion.choices[0].message;

          // Registrar uso de tokens de la segunda llamada
          if (secondCompletion.usage) {
            const inputPrice = aiConfig.openaiInputPrice || 15;
            const outputPrice = aiConfig.openaiOutputPrice || 60;
            const inputCost = Math.round((secondCompletion.usage.prompt_tokens / 1000000) * inputPrice);
            const outputCost = Math.round((secondCompletion.usage.completion_tokens / 1000000) * outputPrice);
            const estimatedCost = inputCost + outputCost;
            await storage.createAiUsageLog({
              provider: 'openai',
              model: 'gpt-4o-mini',
              formId,
              userId: req.user.id,
              promptTokens: secondCompletion.usage.prompt_tokens || 0,
              completionTokens: secondCompletion.usage.completion_tokens || 0,
              totalTokens: secondCompletion.usage.total_tokens || 0,
              estimatedCost,
            });
          }
        }
      } else if (aiConfig.activeProvider === 'deepseek') {
        const OpenAI = (await import('openai')).default;
        const deepseek = new OpenAI({ 
          apiKey,
          baseURL: 'https://api.deepseek.com'
        });

        const messages = [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ];

        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: messages as any,
          tools: agentTools as any,
          tool_choice: 'auto',
        });

        aiResponse = completion.choices[0].message;

        // Registrar uso de tokens
        if (completion.usage) {
          const inputPrice = aiConfig.deepseekInputPrice || 14;
          const outputPrice = aiConfig.deepseekOutputPrice || 28;
          const inputCost = Math.round((completion.usage.prompt_tokens / 1000000) * inputPrice);
          const outputCost = Math.round((completion.usage.completion_tokens / 1000000) * outputPrice);
          const estimatedCost = inputCost + outputCost;
          await storage.createAiUsageLog({
            provider: 'deepseek',
            model: 'deepseek-chat',
            formId,
            userId: req.user.id,
            promptTokens: completion.usage.prompt_tokens || 0,
            completionTokens: completion.usage.completion_tokens || 0,
            totalTokens: completion.usage.total_tokens || 0,
            estimatedCost,
          });
        }

        // Ejecutar tool calls si existen
        if (aiResponse.tool_calls) {
          toolCalls = aiResponse.tool_calls;
          
          for (const toolCall of aiResponse.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let result: any;

            switch (functionName) {
              case 'analyze_responses':
                result = await executeAnalyzeResponses(
                  formId,
                  functionArgs.field,
                  functionArgs.operation,
                  functionArgs.groupBy
                );
                break;
              case 'create_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para crear gráficos" };
                } else {
                  result = await executeCreateChart(
                    formId,
                    functionArgs.title,
                    functionArgs.chartType,
                    functionArgs.xAxisField,
                    functionArgs.aggregationType,
                    functionArgs.yAxisField
                  );
                }
                break;
              case 'update_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para modificar gráficos" };
                } else {
                  result = await executeUpdateChart(
                    functionArgs.chartId,
                    {
                      title: functionArgs.title,
                      chartType: functionArgs.chartType,
                      xAxisField: functionArgs.xAxisField,
                      yAxisField: functionArgs.yAxisField,
                      aggregationType: functionArgs.aggregationType,
                    }
                  );
                }
                break;
              case 'delete_chart':
                if (!hasEditPermission) {
                  result = { error: "No tienes permisos de edición para eliminar gráficos" };
                } else {
                  result = await executeDeleteChart(functionArgs.chartId);
                }
                break;
              case 'get_existing_charts':
                result = await executeGetExistingCharts(formId);
                break;
              case 'get_form_fields':
                result = await executeGetFormFields(formId);
                break;
              default:
                result = { error: `Función desconocida: ${functionName}` };
            }

            toolResults.push({
              tool_call_id: toolCall.id,
              function_name: functionName,
              result,
            });
          }

          // Segunda llamada con los resultados de las herramientas
          const secondCompletion = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
              ...messages,
              aiResponse,
              ...toolResults.map((tr) => ({
                role: 'tool' as const,
                tool_call_id: tr.tool_call_id,
                content: JSON.stringify(tr.result),
              })),
            ] as any,
          });

          aiResponse = secondCompletion.choices[0].message;

          // Registrar uso de tokens de la segunda llamada
          if (secondCompletion.usage) {
            const inputPrice = aiConfig.deepseekInputPrice || 14;
            const outputPrice = aiConfig.deepseekOutputPrice || 28;
            const inputCost = Math.round((secondCompletion.usage.prompt_tokens / 1000000) * inputPrice);
            const outputCost = Math.round((secondCompletion.usage.completion_tokens / 1000000) * outputPrice);
            const estimatedCost = inputCost + outputCost;
            await storage.createAiUsageLog({
              provider: 'deepseek',
              model: 'deepseek-chat',
              formId,
              userId: req.user.id,
              promptTokens: secondCompletion.usage.prompt_tokens || 0,
              completionTokens: secondCompletion.usage.completion_tokens || 0,
              totalTokens: secondCompletion.usage.total_tokens || 0,
              estimatedCost,
            });
          }
        }
      }

      // Guardar mensaje del usuario
      await storage.createChatMessage({
        formId,
        userId: req.user.id,
        role: 'user',
        content: message,
      });

      // Generar contenido del asistente si está vacío
      let assistantContent = aiResponse.content || '';
      if (!assistantContent && toolResults.length > 0) {
        // Generar un resumen de las acciones ejecutadas
        const actions = toolResults.map(tr => {
          if (tr.result.error) {
            return `❌ Error en ${tr.function_name}: ${tr.result.error}`;
          }
          if (tr.function_name === 'create_chart') {
            return `✅ Gráfico creado: ${tr.result.message}`;
          }
          if (tr.function_name === 'update_chart') {
            return `✅ Gráfico actualizado`;
          }
          if (tr.function_name === 'delete_chart') {
            return `✅ Gráfico eliminado`;
          }
          return `✅ Acción completada: ${tr.function_name}`;
        });
        assistantContent = actions.join('\n');
      }

      // Guardar respuesta del asistente
      await storage.createChatMessage({
        formId,
        userId: req.user.id,
        role: 'assistant',
        content: assistantContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      });

      res.json({
        message: assistantContent,
        toolCalls: toolResults,
      });
    } catch (error: any) {
      console.error("Error in chat endpoint:", error);
      
      // Mensajes de error más específicos
      let errorMessage = "Error al procesar tu mensaje";
      
      if (error.message?.includes('API key')) {
        errorMessage = "La clave API no es válida. Por favor verifica la configuración.";
      } else if (error.message?.includes('rate limit')) {
        errorMessage = "Se alcanzó el límite de solicitudes. Por favor intenta más tarde.";
      } else if (error.message?.includes('insufficient_quota')) {
        errorMessage = "La cuenta de IA no tiene créditos suficientes.";
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = "No se pudo conectar con el servicio de IA. Verifica tu conexión.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get chat history
  app.get('/api/forms/:formId/chat/history', isAuthenticated, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const form = await storage.getForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      if (form.creatorId !== req.user.id) {
        const permission = await storage.getUserFormPermission(formId, req.user.id);
        if (!permission) {
          return res.status(403).json({ message: "No tienes permisos para acceder a este formulario" });
        }
      }

      const history = await storage.getChatHistory(formId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Error al obtener historial" });
    }
  });

  // Usage Reports - Login statistics (Super Admin & Admin Auto-host only)
  app.get('/api/reports/logins', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getLoginStatsByDay(days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching login stats:", error);
      res.status(500).json({ message: "Error al obtener estadísticas de inicio de sesión" });
    }
  });

  // Usage Reports - Password reset statistics (Super Admin & Admin Auto-host only)
  app.get('/api/reports/password-resets', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getPasswordResetStatsByDay(days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching password reset stats:", error);
      res.status(500).json({ message: "Error al obtener estadísticas de recuperación de contraseñas" });
    }
  });

  // AI Usage Reports - Get AI usage statistics (Super Admin & Admin Auto-host only)
  app.get('/api/ai-usage/stats', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const provider = req.query.provider as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await storage.getAiUsageStats({ provider, startDate, endDate });
      res.json(stats);
    } catch (error) {
      console.error("Error fetching AI usage stats:", error);
      res.status(500).json({ message: "Error al obtener estadísticas de uso de IA" });
    }
  });

  // AI Usage Reports - Get AI usage logs (Super Admin & Admin Auto-host only)
  app.get('/api/ai-usage/logs', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const provider = req.query.provider as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const logs = await storage.getAiUsageLogs({ provider, startDate, endDate });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching AI usage logs:", error);
      res.status(500).json({ message: "Error al obtener logs de uso de IA" });
    }
  });

  // AI Usage - Update pricing (Super Admin & Admin Auto-host only)
  app.post('/api/ai-usage/pricing', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const { 
        openaiInputPrice, 
        openaiOutputPrice, 
        openaiCachePrice,
        deepseekInputPrice, 
        deepseekOutputPrice, 
        deepseekCachePrice 
      } = req.body;

      const updatedConfig = await storage.updateAiPricing({
        openaiInputPrice,
        openaiOutputPrice,
        openaiCachePrice,
        deepseekInputPrice,
        deepseekOutputPrice,
        deepseekCachePrice,
      });
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating AI pricing:", error);
      res.status(500).json({ message: "Error al actualizar precios de IA" });
    }
  });

  // AI Config - Get current pricing (Super Admin & Admin Auto-host only)
  app.get('/api/ai-usage/pricing', isAuthenticated, requireRole('admin_auto_host'), async (req: any, res) => {
    try {
      const config = await storage.getAiConfig();
      res.json({
        openaiInputPrice: config.openaiInputPrice,
        openaiOutputPrice: config.openaiOutputPrice,
        openaiCachePrice: config.openaiCachePrice,
        deepseekInputPrice: config.deepseekInputPrice,
        deepseekOutputPrice: config.deepseekOutputPrice,
        deepseekCachePrice: config.deepseekCachePrice,
      });
    } catch (error) {
      console.error("Error fetching AI pricing:", error);
      res.status(500).json({ message: "Error al obtener precios de IA" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
