import type { User, Form, FormField, FormResponse, FormPermission } from "@shared/schema";

export interface FormWithFields extends Form {
  fields: FormField[];
}

export interface FormWithCount extends Form {
  responseCount: number;
}

export interface DashboardStats {
  totalForms: number;
  totalResponses: number;
  publishedForms: number;
  draftForms: number;
}

// Forms API
export async function getForms(): Promise<FormWithCount[]> {
  const response = await fetch('/api/forms', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch forms');
  return response.json();
}

export async function getForm(id: string): Promise<FormWithFields> {
  const response = await fetch(`/api/forms/${id}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch form');
  return response.json();
}

export async function createForm(data: { title: string; description?: string }) {
  const response = await fetch('/api/forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create form');
  return response.json();
}

export async function updateForm(id: string, data: Partial<Form>) {
  console.log('updateForm API call with data:', data);
  const response = await fetch(`/api/forms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update form');
  return response.json();
}

export async function deleteForm(id: string) {
  const response = await fetch(`/api/forms/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete form');
  return response.json();
}

export async function publishForm(id: string) {
  const response = await fetch(`/api/forms/${id}/publish`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to publish form');
  return response.json();
}

// Form fields API
export async function updateFormFields(formId: string, fields: Partial<FormField>[]) {
  const response = await fetch(`/api/forms/${formId}/fields/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error('Failed to update form fields');
  return response.json();
}

// Responses API
export async function getFormResponses(formId: string): Promise<FormResponse[]> {
  const response = await fetch(`/api/forms/${formId}/responses`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch responses');
  return response.json();
}

// Permissions API
export async function getFormPermissions(formId: string): Promise<FormPermission[]> {
  const response = await fetch(`/api/forms/${formId}/permissions`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch permissions');
  return response.json();
}

export async function createFormPermission(formId: string, data: { userId: string; permission: 'viewer' | 'editor' }) {
  const response = await fetch(`/api/forms/${formId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create permission');
  return response.json();
}

// Dashboard API
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/dashboard/stats', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
}

// Public form API
export async function getPublicForm(id: string) {
  const response = await fetch(`/api/public/forms/${id}`);
  if (!response.ok) throw new Error('Failed to fetch form');
  return response.json();
}

export async function submitPublicForm(id: string, data: { answers: Record<string, any>; email?: string; urlParams?: Record<string, string> }) {
  const response = await fetch(`/api/public/forms/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to submit form');
  return response.json();
}

// Export API
export function getExportUrl(formId: string): string {
  return `/api/forms/${formId}/export`;
}
