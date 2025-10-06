// Based on blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import {
  insertFormSchema,
  insertFormFieldSchema,
  insertFormPermissionSchema,
  insertFormResponseSchema,
} from "@shared/schema";
import ExcelJS from 'exceljs';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management (Admin only)
  app.patch('/api/users/:userId/role', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'gestor', 'visualizador'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Form routes
  app.post('/api/forms', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let forms;
      if (user.role === 'admin') {
        forms = await storage.getAllForms();
      } else {
        forms = await storage.getFormsByUser(userId);
      }

      // Fetch response counts for each form
      const formsWithCounts = await Promise.all(
        forms.map(async (form) => {
          const responseCount = await storage.getFormResponseCount(form.id);
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

  app.patch('/api/forms/:id', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this form" });
      }

      const updatedForm = await storage.updateForm(id, req.body);
      res.json(updatedForm);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete('/api/forms/:id', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this form" });
      }

      await storage.deleteForm(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  app.post('/api/forms/:id/publish', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
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
  app.post('/api/forms/:formId/fields', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.claims.sub;

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
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

  app.post('/api/forms/:formId/fields/batch', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.claims.sub;
      const { fields } = req.body;

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Delete existing fields and create new ones
      await storage.deleteFormFields(formId);

      const createdFields = [];
      for (const fieldData of fields) {
        const field = await storage.createFormField({
          ...fieldData,
          formId,
        });
        createdFields.push(field);
      }

      res.json(createdFields);
    } catch (error) {
      console.error("Error updating fields:", error);
      res.status(400).json({ message: "Failed to update fields" });
    }
  });

  // Form permission routes
  app.post('/api/forms/:formId/permissions', isAuthenticated, requireRole('admin', 'gestor'), async (req: any, res) => {
    try {
      const { formId } = req.params;
      const userId = req.user.claims.sub;

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.creatorId !== userId) {
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
      const permissions = await storage.getFormPermissions(formId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
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

      // Only return necessary data for public forms
      res.json({
        id: form.id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        shareType: form.shareType,
      });
    } catch (error) {
      console.error("Error fetching public form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post('/api/public/forms/:id/submit', async (req, res) => {
    try {
      const { id } = req.params;
      const { answers, email } = req.body;

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.status !== 'published') {
        return res.status(404).json({ message: "Form not available" });
      }

      const responseData = insertFormResponseSchema.parse({
        formId: id,
        respondentEmail: email,
        answers,
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
      const userId = req.user.claims.sub;
      const stats = await storage.getFormStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
