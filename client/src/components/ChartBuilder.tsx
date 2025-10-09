import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { FormField as FormFieldType, Chart } from "@shared/schema";

const chartFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  chartType: z.enum(["bar", "line", "pie", "area", "scatter"]),
  xAxisField: z.string().min(1, "Selecciona un campo para agrupar"),
  yAxisField: z.string().optional(),
  aggregationType: z.enum(["count", "sum", "avg", "min", "max"]),
}).refine((data) => {
  // Si aggregationType no es "count", yAxisField es requerido
  if (data.aggregationType !== "count" && !data.yAxisField) {
    return false;
  }
  return true;
}, {
  message: "Debes seleccionar un campo para analizar cuando usas suma, promedio, mínimo o máximo",
  path: ["yAxisField"],
});

type ChartFormData = z.infer<typeof chartFormSchema>;

interface ChartBuilderProps {
  formId: string;
  fields: FormFieldType[];
  dynamicFields?: string[];
  urlParams?: string[];
  chart?: Chart;
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function ChartBuilder({ formId, fields, dynamicFields = [], urlParams = [], chart, onClose, children }: ChartBuilderProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!chart;

  // Combinar campos del formulario, campos dinámicos y parámetros URL
  const allFields = [
    ...fields.map(f => ({ value: f.id, label: f.label, type: f.type })),
    ...dynamicFields.map(df => ({ value: df, label: df, type: 'text' })),
    ...urlParams.map(p => ({ value: p, label: p, type: 'text' }))
  ];

  const form = useForm<ChartFormData>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: {
      title: chart?.title || "",
      chartType: chart?.chartType || "bar",
      xAxisField: chart?.xAxisField || "",
      yAxisField: chart?.yAxisField || "",
      aggregationType: chart?.aggregationType || "count",
    },
  });

  // Actualizar valores del formulario cuando cambia el chart
  useEffect(() => {
    if (chart) {
      form.reset({
        title: chart.title,
        chartType: chart.chartType,
        xAxisField: chart.xAxisField,
        yAxisField: chart.yAxisField || "",
        aggregationType: chart.aggregationType,
      });
      setOpen(true); // Abrir el diálogo automáticamente cuando hay un chart para editar
    }
  }, [chart, form]);

  const saveChartMutation = useMutation({
    mutationFn: async (data: ChartFormData) => {
      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/charts/${chart.id}`, data);
        return await response.json();
      } else {
        const response = await apiRequest("POST", `/api/forms/${formId}/charts`, data);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms', formId, 'charts'] });
      toast({
        title: isEditing ? "Gráfico actualizado" : "Gráfico creado",
        description: isEditing 
          ? "El gráfico se ha actualizado exitosamente"
          : "El gráfico se ha creado exitosamente",
      });
      setOpen(false);
      if (!isEditing) {
        form.reset();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `No se pudo ${isEditing ? 'actualizar' : 'crear'} el gráfico`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChartFormData) => {
    saveChartMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" data-testid="button-create-chart">
            <BarChart3 className="h-4 w-4 mr-2" />
            Crear Gráfico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="dialog-chart-builder">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Gráfico' : 'Crear Nuevo Gráfico'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica la configuración de tu gráfico'
              : 'Crea visualizaciones y análisis cruzados de tus datos. Por ejemplo: "Promedio de NPS por Origen"'
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Gráfico</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ej: Distribución de respuestas" 
                      data-testid="input-chart-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chartType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Gráfico</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-chart-type">
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bar" data-testid="option-bar">Barras</SelectItem>
                      <SelectItem value="line" data-testid="option-line">Líneas</SelectItem>
                      <SelectItem value="pie" data-testid="option-pie">Pastel</SelectItem>
                      <SelectItem value="area" data-testid="option-area">Área</SelectItem>
                      <SelectItem value="scatter" data-testid="option-scatter">Dispersión</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="xAxisField"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agrupar por (Eje X)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-x-axis">
                        <SelectValue placeholder="Selecciona el campo de agrupación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allFields.map((f) => (
                        <SelectItem key={f.value} value={f.value} data-testid={`option-x-${f.value}`}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aggregationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Agregación</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-aggregation">
                        <SelectValue placeholder="Selecciona agregación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="count" data-testid="option-count">Contar ocurrencias</SelectItem>
                      <SelectItem value="sum" data-testid="option-sum">Sumar valores</SelectItem>
                      <SelectItem value="avg" data-testid="option-avg">Promedio de valores</SelectItem>
                      <SelectItem value="min" data-testid="option-min">Valor mínimo</SelectItem>
                      <SelectItem value="max" data-testid="option-max">Valor máximo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("aggregationType") !== "count" && (
              <FormField
                control={form.control}
                name="yAxisField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campo a Analizar (Eje Y)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-y-axis">
                          <SelectValue placeholder="Selecciona el campo numérico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allFields.map((f) => (
                          <SelectItem key={f.value} value={f.value} data-testid={`option-y-${f.value}`}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-chart"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveChartMutation.isPending}
                data-testid="button-save-chart"
              >
                {saveChartMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Actualizar Gráfico' : 'Crear Gráfico'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
