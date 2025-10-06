import {
  users,
  forms,
  formFields,
  formPermissions,
  formResponses,
  type User,
  type UpsertUser,
  type Form,
  type InsertForm,
  type FormField,
  type InsertFormField,
  type FormPermission,
  type InsertFormPermission,
  type FormResponse,
  type InsertFormResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: 'admin' | 'gestor' | 'visualizador'): Promise<User>;
  
  // Form operations
  createForm(form: InsertForm): Promise<Form>;
  getForm(id: string): Promise<Form | undefined>;
  getFormWithFields(id: string): Promise<(Form & { fields: FormField[] }) | undefined>;
  getFormsByUser(userId: string): Promise<Form[]>;
  getAllForms(): Promise<Form[]>;
  updateForm(id: string, data: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  publishForm(id: string): Promise<Form>;
  
  // Form field operations
  createFormField(field: InsertFormField): Promise<FormField>;
  getFormFields(formId: string): Promise<FormField[]>;
  updateFormField(id: string, data: Partial<InsertFormField>): Promise<FormField>;
  deleteFormField(id: string): Promise<void>;
  deleteFormFields(formId: string): Promise<void>;
  
  // Permission operations
  createFormPermission(permission: InsertFormPermission): Promise<FormPermission>;
  getFormPermissions(formId: string): Promise<FormPermission[]>;
  getUserFormPermission(formId: string, userId: string): Promise<FormPermission | undefined>;
  deleteFormPermission(id: string): Promise<void>;
  
  // Response operations
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  getFormResponses(formId: string): Promise<FormResponse[]>;
  getFormResponseCount(formId: string): Promise<number>;
  
  // Dashboard stats
  getFormStats(userId: string): Promise<{
    totalForms: number;
    totalResponses: number;
    publishedForms: number;
    draftForms: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'admin' | 'gestor' | 'visualizador'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Form operations
  async createForm(formData: InsertForm): Promise<Form> {
    const [form] = await db.insert(forms).values(formData).returning();
    return form;
  }

  async getForm(id: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }

  async getFormWithFields(id: string): Promise<(Form & { fields: FormField[] }) | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    if (!form) return undefined;

    const fields = await this.getFormFields(id);
    return { ...form, fields };
  }

  async getFormsByUser(userId: string): Promise<Form[]> {
    return await db
      .select()
      .from(forms)
      .where(eq(forms.creatorId, userId))
      .orderBy(desc(forms.updatedAt));
  }

  async getAllForms(): Promise<Form[]> {
    return await db.select().from(forms).orderBy(desc(forms.updatedAt));
  }

  async updateForm(id: string, data: Partial<InsertForm>): Promise<Form> {
    const [form] = await db
      .update(forms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return form;
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  async publishForm(id: string): Promise<Form> {
    const [form] = await db
      .update(forms)
      .set({ 
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(forms.id, id))
      .returning();
    return form;
  }

  // Form field operations
  async createFormField(fieldData: InsertFormField): Promise<FormField> {
    const [field] = await db.insert(formFields).values(fieldData).returning();
    return field;
  }

  async getFormFields(formId: string): Promise<FormField[]> {
    return await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(formFields.order);
  }

  async updateFormField(id: string, data: Partial<InsertFormField>): Promise<FormField> {
    const [field] = await db
      .update(formFields)
      .set(data)
      .where(eq(formFields.id, id))
      .returning();
    return field;
  }

  async deleteFormField(id: string): Promise<void> {
    await db.delete(formFields).where(eq(formFields.id, id));
  }

  async deleteFormFields(formId: string): Promise<void> {
    await db.delete(formFields).where(eq(formFields.formId, formId));
  }

  // Permission operations
  async createFormPermission(permissionData: InsertFormPermission): Promise<FormPermission> {
    const [permission] = await db.insert(formPermissions).values(permissionData).returning();
    return permission;
  }

  async getFormPermissions(formId: string): Promise<FormPermission[]> {
    return await db
      .select()
      .from(formPermissions)
      .where(eq(formPermissions.formId, formId));
  }

  async getUserFormPermission(formId: string, userId: string): Promise<FormPermission | undefined> {
    const [permission] = await db
      .select()
      .from(formPermissions)
      .where(
        and(
          eq(formPermissions.formId, formId),
          eq(formPermissions.userId, userId)
        )
      );
    return permission;
  }

  async deleteFormPermission(id: string): Promise<void> {
    await db.delete(formPermissions).where(eq(formPermissions.id, id));
  }

  // Response operations
  async createFormResponse(responseData: InsertFormResponse): Promise<FormResponse> {
    const [response] = await db.insert(formResponses).values(responseData).returning();
    return response;
  }

  async getFormResponses(formId: string): Promise<FormResponse[]> {
    return await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));
  }

  async getFormResponseCount(formId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formResponses)
      .where(eq(formResponses.formId, formId));
    return result[0]?.count || 0;
  }

  // Dashboard stats
  async getFormStats(userId: string): Promise<{
    totalForms: number;
    totalResponses: number;
    publishedForms: number;
    draftForms: number;
  }> {
    const userForms = await this.getFormsByUser(userId);
    
    const totalForms = userForms.length;
    const publishedForms = userForms.filter(f => f.status === 'published').length;
    const draftForms = userForms.filter(f => f.status === 'draft').length;
    
    let totalResponses = 0;
    for (const form of userForms) {
      const count = await this.getFormResponseCount(form.id);
      totalResponses += count;
    }
    
    return {
      totalForms,
      totalResponses,
      publishedForms,
      draftForms,
    };
  }
}

export const storage = new DatabaseStorage();
