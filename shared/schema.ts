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
