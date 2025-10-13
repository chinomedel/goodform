import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "./db";
import { forms, formResponses, charts, formFields, chatMessages } from "@shared/schema";
import type { Chart } from "@shared/schema";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// Definiciones de herramientas para el LLM
export const agentTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "analyze_responses",
      description: "Analiza las respuestas del formulario para obtener estadísticas, promedios, conteos, etc.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "Campo a analizar (ej: 'nps', 'origen', 'email')",
          },
          operation: {
            type: "string",
            enum: ["count", "avg", "sum", "min", "max", "list"],
            description: "Operación a realizar: count (contar), avg (promedio), sum (suma), min (mínimo), max (máximo), list (listar valores únicos)",
          },
          groupBy: {
            type: "string",
            description: "Campo por el cual agrupar (opcional)",
          },
        },
        required: ["field", "operation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_chart",
      description: "Crea un nuevo gráfico de visualización de datos",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Título descriptivo del gráfico",
          },
          chartType: {
            type: "string",
            enum: ["bar", "line", "pie", "area", "scatter"],
            description: "Tipo de gráfico",
          },
          xAxisField: {
            type: "string",
            description: "Campo para el eje X (agrupar por)",
          },
          yAxisField: {
            type: "string",
            description: "Campo para el eje Y (analizar). Solo para agregaciones sum, avg, min, max",
          },
          aggregationType: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
            description: "Tipo de agregación",
          },
        },
        required: ["title", "chartType", "xAxisField", "aggregationType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_chart",
      description: "Modifica un gráfico existente. Usa get_existing_charts primero para ver los IDs disponibles.",
      parameters: {
        type: "object",
        properties: {
          chartId: {
            type: "string",
            description: "ID del gráfico a modificar",
          },
          title: {
            type: "string",
            description: "Nuevo título (opcional)",
          },
          chartType: {
            type: "string",
            enum: ["bar", "line", "pie", "area", "scatter"],
            description: "Nuevo tipo de gráfico (opcional)",
          },
          xAxisField: {
            type: "string",
            description: "Nuevo campo para el eje X (opcional)",
          },
          yAxisField: {
            type: "string",
            description: "Nuevo campo para el eje Y (opcional)",
          },
          aggregationType: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
            description: "Nuevo tipo de agregación (opcional)",
          },
        },
        required: ["chartId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_chart",
      description: "Elimina un gráfico existente. Usa get_existing_charts primero para ver los IDs disponibles.",
      parameters: {
        type: "object",
        properties: {
          chartId: {
            type: "string",
            description: "ID del gráfico a eliminar",
          },
        },
        required: ["chartId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_existing_charts",
      description: "Obtiene la lista de gráficos existentes del formulario con sus IDs y configuraciones",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_form_fields",
      description: "Obtiene la lista de campos disponibles en el formulario",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Implementaciones de las herramientas
export async function executeAnalyzeResponses(
  formId: string,
  field: string,
  operation: string,
  groupBy?: string
): Promise<any> {
  const responses = await db
    .select()
    .from(formResponses)
    .where(eq(formResponses.formId, formId));

  if (responses.length === 0) {
    return { error: "No hay respuestas para analizar" };
  }

  // Extraer valores del campo
  const extractValue = (response: any, fieldName: string): any => {
    if (response.answers?.values?.[fieldName] !== undefined) {
      return response.answers.values[fieldName];
    }
    if (response.answers?.[fieldName] !== undefined) {
      return response.answers[fieldName];
    }
    if (response.urlParams?.[fieldName] !== undefined) {
      return response.urlParams[fieldName];
    }
    return null;
  };

  const values = responses.map((r) => extractValue(r, field)).filter((v) => v !== null);

  if (values.length === 0) {
    return { error: `No se encontraron valores para el campo '${field}'` };
  }

  // Operaciones sin agrupar
  if (!groupBy) {
    switch (operation) {
      case "count":
        return { result: values.length };
      case "avg": {
        const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numValues.length === 0) return { error: "No hay valores numéricos para calcular promedio" };
        const avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        return { result: avg.toFixed(2) };
      }
      case "sum": {
        const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numValues.length === 0) return { error: "No hay valores numéricos para sumar" };
        return { result: numValues.reduce((a, b) => a + b, 0) };
      }
      case "min": {
        const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numValues.length === 0) return { error: "No hay valores numéricos" };
        return { result: Math.min(...numValues) };
      }
      case "max": {
        const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numValues.length === 0) return { error: "No hay valores numéricos" };
        return { result: Math.max(...numValues) };
      }
      case "list": {
        const uniqueSet = new Set(values);
        const unique = Array.from(uniqueSet);
        return { result: unique.slice(0, 20) }; // Limitar a 20 valores únicos
      }
      default:
        return { error: `Operación '${operation}' no reconocida` };
    }
  }

  // Operaciones agrupadas
  const grouped: Record<string, any[]> = {};
  responses.forEach((r) => {
    const groupValue = extractValue(r, groupBy);
    const fieldValue = extractValue(r, field);
    if (groupValue !== null && fieldValue !== null) {
      if (!grouped[groupValue]) grouped[groupValue] = [];
      grouped[groupValue].push(fieldValue);
    }
  });

  const results: Record<string, any> = {};
  for (const [group, vals] of Object.entries(grouped)) {
    switch (operation) {
      case "count":
        results[group] = vals.length;
        break;
      case "avg": {
        const numVals = vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numVals.length > 0) {
          results[group] = (numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(2);
        }
        break;
      }
      case "sum": {
        const numVals = vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numVals.length > 0) {
          results[group] = numVals.reduce((a, b) => a + b, 0);
        }
        break;
      }
      case "min": {
        const numVals = vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numVals.length > 0) {
          results[group] = Math.min(...numVals);
        }
        break;
      }
      case "max": {
        const numVals = vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numVals.length > 0) {
          results[group] = Math.max(...numVals);
        }
        break;
      }
    }
  }

  return { result: results };
}

export async function executeCreateChart(
  formId: string,
  title: string,
  chartType: string,
  xAxisField: string,
  aggregationType: string,
  yAxisField?: string
): Promise<any> {
  const newChart = await db
    .insert(charts)
    .values({
      formId,
      title,
      chartType: chartType as any,
      xAxisField,
      yAxisField: yAxisField || null,
      aggregationType: aggregationType as any,
    })
    .returning();

  return { success: true, chartId: newChart[0].id, message: `Gráfico "${title}" creado exitosamente` };
}

export async function executeUpdateChart(
  chartId: string,
  updates: Partial<Chart>
): Promise<any> {
  const existingChart = await db.select().from(charts).where(eq(charts.id, chartId));
  
  if (existingChart.length === 0) {
    return { error: `No se encontró el gráfico con ID ${chartId}` };
  }

  const updatedChart = await db
    .update(charts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(charts.id, chartId))
    .returning();

  return { success: true, message: `Gráfico actualizado exitosamente`, chart: updatedChart[0] };
}

export async function executeDeleteChart(chartId: string): Promise<any> {
  const existingChart = await db.select().from(charts).where(eq(charts.id, chartId));
  
  if (existingChart.length === 0) {
    return { error: `No se encontró el gráfico con ID ${chartId}` };
  }

  await db.delete(charts).where(eq(charts.id, chartId));

  return { success: true, message: `Gráfico eliminado exitosamente` };
}

export async function executeGetExistingCharts(formId: string): Promise<any> {
  const existingCharts = await db
    .select()
    .from(charts)
    .where(eq(charts.formId, formId))
    .orderBy(desc(charts.createdAt));

  return {
    charts: existingCharts.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.chartType,
      xAxis: c.xAxisField,
      yAxis: c.yAxisField,
      aggregation: c.aggregationType,
    })),
  };
}

export async function executeGetFormFields(formId: string): Promise<any> {
  // Obtener campos del formulario
  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId));

  // Obtener campos de parámetros URL y respuestas
  const form = await db.select().from(forms).where(eq(forms.id, formId));
  const urlParams = form[0]?.urlParams as any;
  
  const responses = await db
    .select()
    .from(formResponses)
    .where(eq(formResponses.formId, formId))
    .limit(5);

  const dynamicFields = new Set<string>();
  
  // Agregar campos de URL params
  if (urlParams) {
    Object.keys(urlParams).forEach((key) => dynamicFields.add(key));
  }

  // Agregar campos de respuestas
  responses.forEach((r) => {
    if (r.answers) {
      if ((r.answers as any).values) {
        Object.keys((r.answers as any).values).forEach((key) => dynamicFields.add(key));
      } else {
        Object.keys(r.answers).forEach((key) => dynamicFields.add(key));
      }
    }
    if (r.urlParams) {
      Object.keys(r.urlParams as any).forEach((key) => dynamicFields.add(key));
    }
  });

  return {
    visualFields: fields.map((f) => ({ name: f.label, id: f.id, type: f.type })),
    dynamicFields: Array.from(dynamicFields),
  };
}
