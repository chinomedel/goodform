import { useState } from "react";
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
import type { FormField as FormFieldType } from "@shared/schema";

const chartFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  chartType: z.enum(["bar", "line", "pie", "area", "scatter"]),
  xAxisField: z.string().min(1, "Selecciona un campo para el eje X"),
  yAxisField: z.string().optional(),
  aggregationType: z.enum(["count", "sum", "avg", "min", "max"]),
});

type ChartFormData = z.infer<typeof chartFormSchema>;

interface ChartBuilderProps {
  formId: string;
  fields: FormFieldType[];
  dynamicFields?: string[];
  urlParams?: string[];
  children?: React.ReactNode;
}

export default function ChartBuilder({ formId, fields, dynamicFields = [], urlParams = [], children }: ChartBuilderProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Combinar campos del formulario, campos dinámicos y parámetros URL
  const allFields = [
    ...fields.map(f => ({ value: f.id, label: f.label, type: f.type })),
    ...dynamicFields.map(df => ({ value: df, label: df, type: 'text' })),
    ...urlParams.map(p => ({ value: p, label: p, type: 'text' }))
  ];

  const form = useForm<ChartFormData>({
    resolver: zodResolver(chartFormSchema),
    defaultValues: {
      title: "",
      chartType: "bar",
      xAxisField: "",
      yAxisField: "",
      aggregationType: "count",
    },
  });

  const createChartMutation = useMutation({
    mutationFn: async (data: ChartFormData) => {
      const response = await apiRequest("POST", `/api/forms/${formId}/charts`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms', formId, 'charts'] });
      toast({
        title: "Gráfico creado",
        description: "El gráfico se ha creado exitosamente",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el gráfico",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChartFormData) => {
    createChartMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Crear Nuevo Gráfico</DialogTitle>
          <DialogDescription>
            Configura un gráfico para visualizar los datos de tu formulario
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
                  <FormLabel>Campo para Eje X / Categoría</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-x-axis">
                        <SelectValue placeholder="Selecciona un campo" />
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
                      <SelectItem value="count" data-testid="option-count">Contar</SelectItem>
                      <SelectItem value="sum" data-testid="option-sum">Sumar</SelectItem>
                      <SelectItem value="avg" data-testid="option-avg">Promedio</SelectItem>
                      <SelectItem value="min" data-testid="option-min">Mínimo</SelectItem>
                      <SelectItem value="max" data-testid="option-max">Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createChartMutation.isPending}
                data-testid="button-save-chart"
              >
                {createChartMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Crear Gráfico
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
