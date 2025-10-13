import {
  users,
  roles,
  forms,
  formFields,
  formPermissions,
  formResponses,
  appConfig,
  deployments,
  licenses,
  charts,
  aiConfig,
  smtpConfig,
  chatMessages,
  passwordResetTokens,
  loginLogs,
  type User,
  type InsertUser,
  type Role,
  type InsertRole,
  type LoginLog,
  type InsertLoginLog,
  type Form,
  type InsertForm,
  type FormField,
  type InsertFormField,
  type FormPermission,
  type InsertFormPermission,
  type FormResponse,
  type InsertFormResponse,
  type AppConfig,
  type InsertAppConfig,
  type Deployment,
  type InsertDeployment,
  type License,
  type InsertLicense,
  type Chart,
  type InsertChart,
  type AiConfig,
  type InsertAiConfig,
  type SmtpConfig,
  type InsertSmtpConfig,
  type ChatMessage,
  type InsertChatMessage,
  type PasswordResetToken,
  type InsertPasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Role operations
  getRole(id: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  
  // User operations - required for local authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithRole(id: string): Promise<(User & { role: Role }) | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, roleId: string): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;
  updateUserStatus(userId: string, data: { isDeleted?: boolean; blockReason?: 'non_payment' | 'login_attempts' | 'general' | null; blockedAt?: Date | null }): Promise<User>;
  
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
  getUserPermissions(userId: string): Promise<FormPermission[]>;
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
  
  // App configuration
  getAppConfig(): Promise<AppConfig>;
  updateAppConfig(config: Partial<InsertAppConfig>): Promise<AppConfig>;
  
  // Deployment operations
  getDeployment(): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, data: Partial<InsertDeployment>): Promise<Deployment>;
  
  // License operations
  createLicense(license: InsertLicense): Promise<License>;
  getLicense(licenseKey: string): Promise<License | undefined>;
  getLicenseById(id: string): Promise<License | undefined>;
  getAllLicenses(): Promise<License[]>;
  updateLicenseStatus(id: string, status: 'active' | 'revoked' | 'expired'): Promise<License>;
  
  // Form count for license validation
  countForms(userId?: string): Promise<number>;
  
  // Chart operations
  createChart(chart: InsertChart): Promise<Chart>;
  getChart(id: string): Promise<Chart | undefined>;
  getFormCharts(formId: string): Promise<Chart[]>;
  updateChart(id: string, data: Partial<InsertChart>): Promise<Chart>;
  deleteChart(id: string): Promise<void>;
  
  // AI Config operations
  getAiConfig(): Promise<AiConfig>;
  updateAiConfig(config: Partial<InsertAiConfig>): Promise<AiConfig>;
  updateAiApiKeys(openaiKey?: string, deepseekKey?: string): Promise<AiConfig>;
  getDecryptedApiKeys(): Promise<{ openai?: string; deepseek?: string }>;
  
  // SMTP Config operations
  getSmtpConfig(): Promise<SmtpConfig>;
  updateSmtpConfig(config: Partial<InsertSmtpConfig>): Promise<SmtpConfig>;
  updateSmtpCredentials(user?: string, password?: string): Promise<SmtpConfig>;
  getDecryptedSmtpCredentials(): Promise<{ user?: string; password?: string }>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(formId: string): Promise<ChatMessage[]>;
  
  // Password Reset Token operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
  
  // Login Log operations
  createLoginLog(log: InsertLoginLog): Promise<LoginLog>;
  
  // Usage Reports operations
  getLoginStatsByDay(days: number): Promise<{ date: string; count: number }[]>;
  getPasswordResetStatsByDay(days: number): Promise<{ date: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Role operations
  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithRole(id: string): Promise<(User & { role: Role }) | undefined> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id));
    
    if (!result[0] || !result[0].roles) return undefined;
    
    return {
      ...result[0].users,
      role: result[0].roles,
    };
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, roleId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ roleId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, data: { isDeleted?: boolean; blockReason?: 'non_payment' | 'login_attempts' | 'general' | null; blockedAt?: Date | null }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
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
        shareType: 'public',
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

  async getUserPermissions(userId: string): Promise<FormPermission[]> {
    return await db
      .select()
      .from(formPermissions)
      .where(eq(formPermissions.userId, userId));
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

  // App configuration
  async getAppConfig(): Promise<AppConfig> {
    const [config] = await db.select().from(appConfig).where(eq(appConfig.id, 'default'));
    
    if (!config) {
      const [newConfig] = await db.insert(appConfig).values({
        id: 'default',
        appName: 'GoodForm',
        primaryColor: '#6366f1',
      }).returning();
      return newConfig;
    }
    
    return config;
  }

  async updateAppConfig(configData: Partial<InsertAppConfig>): Promise<AppConfig> {
    const normalizedData = {
      ...configData,
      logoUrl: configData.logoUrl === "" ? null : configData.logoUrl,
      faviconUrl: configData.faviconUrl === "" ? null : configData.faviconUrl,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(appConfig)
      .set(normalizedData)
      .where(eq(appConfig.id, 'default'))
      .returning();
    
    if (!updated) {
      const [newConfig] = await db.insert(appConfig).values({
        id: 'default',
        ...normalizedData,
      }).returning();
      return newConfig;
    }
    
    return updated;
  }

  // Deployment operations
  async getDeployment(): Promise<Deployment | undefined> {
    const [deployment] = await db.select().from(deployments).limit(1);
    return deployment;
  }

  async createDeployment(deploymentData: InsertDeployment): Promise<Deployment> {
    const [deployment] = await db.insert(deployments).values(deploymentData).returning();
    return deployment;
  }

  async updateDeployment(id: string, data: Partial<InsertDeployment>): Promise<Deployment> {
    const [deployment] = await db
      .update(deployments)
      .set(data)
      .where(eq(deployments.id, id))
      .returning();
    return deployment;
  }

  // License operations
  async createLicense(licenseData: InsertLicense): Promise<License> {
    const [license] = await db.insert(licenses).values(licenseData).returning();
    return license;
  }

  async getLicense(licenseKey: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey));
    return license;
  }

  async getLicenseById(id: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    return license;
  }

  async getAllLicenses(): Promise<License[]> {
    return await db.select().from(licenses).orderBy(desc(licenses.issuedAt));
  }

  async updateLicenseStatus(id: string, status: 'active' | 'revoked' | 'expired'): Promise<License> {
    const [license] = await db
      .update(licenses)
      .set({ status })
      .where(eq(licenses.id, id))
      .returning();
    return license;
  }

  // Form count for license validation
  async countForms(userId?: string): Promise<number> {
    if (userId) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms)
        .where(eq(forms.creatorId, userId));
      return result[0]?.count || 0;
    } else {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms);
      return result[0]?.count || 0;
    }
  }

  // Chart operations
  async createChart(chartData: InsertChart): Promise<Chart> {
    const [chart] = await db.insert(charts).values(chartData).returning();
    return chart;
  }

  async getChart(id: string): Promise<Chart | undefined> {
    const [chart] = await db.select().from(charts).where(eq(charts.id, id));
    return chart;
  }

  async getFormCharts(formId: string): Promise<Chart[]> {
    return await db.select().from(charts).where(eq(charts.formId, formId)).orderBy(desc(charts.createdAt));
  }

  async updateChart(id: string, data: Partial<InsertChart>): Promise<Chart> {
    const [chart] = await db
      .update(charts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(charts.id, id))
      .returning();
    return chart;
  }

  async deleteChart(id: string): Promise<void> {
    await db.delete(charts).where(eq(charts.id, id));
  }

  // AI Config operations
  async getAiConfig(): Promise<AiConfig> {
    const [config] = await db.select().from(aiConfig).where(eq(aiConfig.id, 'default'));
    
    if (!config) {
      // Create default config if it doesn't exist
      const [newConfig] = await db.insert(aiConfig).values({ id: 'default' }).returning();
      return newConfig;
    }
    
    return config;
  }

  async updateAiConfig(configData: Partial<InsertAiConfig>): Promise<AiConfig> {
    const [config] = await db
      .update(aiConfig)
      .set({ ...configData, updatedAt: new Date() })
      .where(eq(aiConfig.id, 'default'))
      .returning();
    return config;
  }

  async updateAiApiKeys(openaiKey?: string, deepseekKey?: string): Promise<AiConfig> {
    const { encrypt } = await import('./crypto-utils');
    
    const updateData: any = { updatedAt: new Date() };
    
    if (openaiKey !== undefined) {
      updateData.openaiApiKey = openaiKey ? encrypt(openaiKey) : null;
    }
    
    if (deepseekKey !== undefined) {
      updateData.deepseekApiKey = deepseekKey ? encrypt(deepseekKey) : null;
    }
    
    const [config] = await db
      .update(aiConfig)
      .set(updateData)
      .where(eq(aiConfig.id, 'default'))
      .returning();
    
    return config;
  }

  async getDecryptedApiKeys(): Promise<{ openai?: string; deepseek?: string }> {
    const { decrypt } = await import('./crypto-utils');
    
    const config = await this.getAiConfig();
    
    return {
      openai: config.openaiApiKey ? decrypt(config.openaiApiKey) : undefined,
      deepseek: config.deepseekApiKey ? decrypt(config.deepseekApiKey) : undefined,
    };
  }

  // SMTP Config operations
  async getSmtpConfig(): Promise<SmtpConfig> {
    const [config] = await db.select().from(smtpConfig).where(eq(smtpConfig.id, 'default'));
    
    if (!config) {
      // Create default config if it doesn't exist
      const [newConfig] = await db.insert(smtpConfig).values({ id: 'default' }).returning();
      return newConfig;
    }
    
    return config;
  }

  async updateSmtpConfig(configData: Partial<InsertSmtpConfig>): Promise<SmtpConfig> {
    const [config] = await db
      .update(smtpConfig)
      .set({ ...configData, updatedAt: new Date() })
      .where(eq(smtpConfig.id, 'default'))
      .returning();
    return config;
  }

  async updateSmtpCredentials(user?: string, password?: string): Promise<SmtpConfig> {
    const { encrypt } = await import('./crypto-utils');
    
    const updateData: any = { updatedAt: new Date() };
    
    if (user !== undefined) {
      updateData.user = user ? encrypt(user) : null;
    }
    
    if (password !== undefined) {
      updateData.password = password ? encrypt(password) : null;
    }
    
    const [config] = await db
      .update(smtpConfig)
      .set(updateData)
      .where(eq(smtpConfig.id, 'default'))
      .returning();
    
    return config;
  }

  async getDecryptedSmtpCredentials(): Promise<{ user?: string; password?: string }> {
    const { decrypt } = await import('./crypto-utils');
    
    const config = await this.getSmtpConfig();
    
    return {
      user: config.user ? decrypt(config.user) : undefined,
      password: config.password ? decrypt(config.password) : undefined,
    };
  }

  // Chat operations
  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getChatHistory(formId: string): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.formId, formId))
      .orderBy(chatMessages.createdAt);
    return messages;
  }

  // Password Reset Token operations
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        sql`${passwordResetTokens.usedAt} IS NULL`,
        sql`${passwordResetTokens.expiresAt} > NOW()`
      ));
    return resetToken;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }

  // Login Log operations
  async createLoginLog(logData: InsertLoginLog): Promise<LoginLog> {
    const [log] = await db
      .insert(loginLogs)
      .values(logData)
      .returning();
    return log;
  }

  // Usage Reports operations
  async getLoginStatsByDay(days: number): Promise<{ date: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        DATE(login_at) as date,
        COUNT(*)::int as count
      FROM login_logs
      WHERE login_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY DATE(login_at)
      ORDER BY DATE(login_at) DESC
    `);
    
    return result.rows.map((row: any) => ({
      date: row.date,
      count: row.count,
    }));
  }

  async getPasswordResetStatsByDay(days: number): Promise<{ date: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as count
      FROM password_reset_tokens
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
    `);
    
    return result.rows.map((row: any) => ({
      date: row.date,
      count: row.count,
    }));
  }
}

export const storage = new DatabaseStorage();
