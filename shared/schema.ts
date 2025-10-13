import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin_auto_host', 'visualizador_auto_host', 'cliente_saas', 'super_admin']);
export const formStatusEnum = pgEnum('form_status', ['draft', 'published']);
export const formPermissionEnum = pgEnum('form_permission', ['viewer', 'editor']);
export const shareTypeEnum = pgEnum('share_type', ['users', 'public']);
export const fieldTypeEnum = pgEnum('field_type', ['text', 'email', 'number', 'select', 'checkbox', 'date', 'textarea']);
export const builderModeEnum = pgEnum('builder_mode', ['visual', 'code']);
export const deploymentModeEnum = pgEnum('deployment_mode', ['saas', 'self-hosted']);
export const licenseStatusEnum = pgEnum('license_status', ['active', 'revoked', 'expired']);
export const chartTypeEnum = pgEnum('chart_type', ['bar', 'line', 'pie', 'area', 'scatter']);
export const aggregationTypeEnum = pgEnum('aggregation_type', ['count', 'sum', 'avg', 'min', 'max']);
export const aiProviderEnum = pgEnum('ai_provider', ['openai', 'deepseek']);
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant', 'system']);
export const blockReasonEnum = pgEnum('block_reason', ['non_payment', 'login_attempts', 'general']);

// Session storage table - used by passport-local for session management
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Roles table - defines available user roles
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table - email/password authentication with scrypt hashing
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roleId: varchar("role_id").notNull().references(() => roles.id).default('cliente_saas'),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  blockReason: blockReasonEnum("block_reason"),
  blockedAt: timestamp("blocked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: formStatusEnum("status").notNull().default('draft'),
  shareType: shareTypeEnum("share_type").notNull().default('users'),
  builderMode: builderModeEnum("builder_mode").notNull().default('visual'),
  customHtml: text("custom_html"),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  submitButtonText: varchar("submit_button_text").notNull().default('Enviar respuesta'),
  submitButtonColor: varchar("submit_button_color").notNull().default('#f97316'),
  urlParams: jsonb("url_params"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  type: fieldTypeEnum("type").notNull(),
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  required: boolean("required").notNull().default(false),
  options: text("options").array(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formPermissions = pgTable("form_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: formPermissionEnum("permission").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  respondentId: varchar("respondent_id").references(() => users.id, { onDelete: 'set null' }),
  respondentEmail: varchar("respondent_email"),
  answers: jsonb("answers").notNull(),
  urlParams: jsonb("url_params"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const appConfig = pgTable("app_config", {
  id: varchar("id").primaryKey().default('default'),
  appName: varchar("app_name").notNull().default('GoodForm'),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: varchar("primary_color").notNull().default('#f97316'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deployment table - stores deployment configuration for auto-host
export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mode: deploymentModeEnum("mode").notNull().default('saas'),
  setupCompleted: boolean("setup_completed").notNull().default(false),
  licenseKey: varchar("license_key"),
  lastValidated: timestamp("last_validated"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Licenses table - stores license codes (SaaS only)
export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseKey: varchar("license_key").notNull().unique(),
  issuedToEmail: varchar("issued_to_email").notNull(),
  issuedBy: varchar("issued_by").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: licenseStatusEnum("status").notNull().default('active'),
  deploymentInfo: jsonb("deployment_info"),
});

// Charts table - stores chart configurations for form analytics
export const charts = pgTable("charts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  chartType: chartTypeEnum("chart_type").notNull(),
  xAxisField: varchar("x_axis_field").notNull(),
  yAxisField: varchar("y_axis_field"),
  aggregationType: aggregationTypeEnum("aggregation_type").notNull().default('count'),
  filters: jsonb("filters"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Config table - stores AI provider configuration
export const aiConfig = pgTable("ai_config", {
  id: varchar("id").primaryKey().default('default'),
  activeProvider: aiProviderEnum("active_provider").notNull().default('openai'),
  openaiApiKey: text("openai_api_key"),
  deepseekApiKey: text("deepseek_api_key"),
  // OpenAI pricing (in cents per million tokens)
  openaiInputPrice: integer("openai_input_price").notNull().default(15), // $0.15 per million
  openaiOutputPrice: integer("openai_output_price").notNull().default(60), // $0.60 per million
  openaiCachePrice: integer("openai_cache_price").notNull().default(0), // Cache pricing if applicable
  // DeepSeek pricing (in cents per million tokens)
  deepseekInputPrice: integer("deepseek_input_price").notNull().default(14), // $0.14 per million
  deepseekOutputPrice: integer("deepseek_output_price").notNull().default(28), // $0.28 per million
  deepseekCachePrice: integer("deepseek_cache_price").notNull().default(1), // $0.014 per million (rounded to 1 cent)
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Usage Logs table - stores token usage for AI providers
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: aiProviderEnum("provider").notNull(),
  model: varchar("model").notNull(),
  formId: varchar("form_id").references(() => forms.id, { onDelete: 'set null' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: integer("estimated_cost").notNull().default(0), // Cost in cents
  createdAt: timestamp("created_at").defaultNow(),
});

// SMTP Config table - stores SMTP email configuration
export const smtpConfig = pgTable("smtp_config", {
  id: varchar("id").primaryKey().default('default'),
  host: varchar("host").notNull().default(''),
  port: integer("port").notNull().default(587),
  secure: boolean("secure").notNull().default(false),
  user: text("user"),
  password: text("password"),
  fromEmail: varchar("from_email").notNull().default(''),
  fromName: varchar("from_name").notNull().default(''),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password Reset Tokens table - stores tokens for password reset flow
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// Login Logs table - stores user login activity for analytics
export const loginLogs = pgTable("login_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginAt: timestamp("login_at").defaultNow(),
});

// Chat Messages table - stores conversation history with AI agent
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  createdForms: many(forms),
  formPermissions: many(formPermissions),
  responses: many(formResponses),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  creator: one(users, {
    fields: [forms.creatorId],
    references: [users.id],
  }),
  fields: many(formFields),
  permissions: many(formPermissions),
  responses: many(formResponses),
  charts: many(charts),
  chatMessages: many(chatMessages),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, {
    fields: [formFields.formId],
    references: [forms.id],
  }),
}));

export const formPermissionsRelations = relations(formPermissions, ({ one }) => ({
  form: one(forms, {
    fields: [formPermissions.formId],
    references: [forms.id],
  }),
  user: one(users, {
    fields: [formPermissions.userId],
    references: [users.id],
  }),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, {
    fields: [formResponses.formId],
    references: [forms.id],
  }),
  respondent: one(users, {
    fields: [formResponses.respondentId],
    references: [users.id],
  }),
}));

export const chartsRelations = relations(charts, ({ one }) => ({
  form: one(forms, {
    fields: [charts.formId],
    references: [forms.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  form: one(forms, {
    fields: [chatMessages.formId],
    references: [forms.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  form: one(forms, {
    fields: [aiUsageLogs.formId],
    references: [forms.id],
  }),
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertRoleSchema = createInsertSchema(roles).omit({
  createdAt: true,
});
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
  createdAt: true,
});
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type FormField = typeof formFields.$inferSelect;

export const insertFormPermissionSchema = createInsertSchema(formPermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertFormPermission = z.infer<typeof insertFormPermissionSchema>;
export type FormPermission = typeof formPermissions.$inferSelect;

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  submittedAt: true,
});
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;

export const insertAppConfigSchema = createInsertSchema(appConfig).omit({
  id: true,
  updatedAt: true,
}).extend({
  logoUrl: z.string().url("Debe ser una URL válida").nullable().optional().or(z.literal("")),
  faviconUrl: z.string().url("Debe ser una URL válida").nullable().optional().or(z.literal("")),
});
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;
export type AppConfig = typeof appConfig.$inferSelect;

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
});
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  issuedAt: true,
});
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License = typeof licenses.$inferSelect;

export const insertChartSchema = createInsertSchema(charts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChart = z.infer<typeof insertChartSchema>;
export type Chart = typeof charts.$inferSelect;

export const insertAiConfigSchema = createInsertSchema(aiConfig).omit({
  id: true,
  updatedAt: true,
});
export type InsertAiConfig = z.infer<typeof insertAiConfigSchema>;
export type AiConfig = typeof aiConfig.$inferSelect;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const insertSmtpConfigSchema = createInsertSchema(smtpConfig).omit({
  id: true,
  updatedAt: true,
}).extend({
  host: z.string().min(1, "Host es requerido"),
  port: z.number().min(1).max(65535, "Puerto debe estar entre 1 y 65535"),
  fromEmail: z.string().email("Debe ser un email válido"),
});
export type InsertSmtpConfig = z.infer<typeof insertSmtpConfigSchema>;
export type SmtpConfig = typeof smtpConfig.$inferSelect;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({
  id: true,
  loginAt: true,
});
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;
export type LoginLog = typeof loginLogs.$inferSelect;

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
