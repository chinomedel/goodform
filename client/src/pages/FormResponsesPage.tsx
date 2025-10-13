import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getForm, getFormResponses, getExportUrl } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ChartBuilder from "@/components/ChartBuilder";
import ChartRenderer from "@/components/ChartRenderer";
import { ChatAgent } from "@/components/ChatAgent";
import { useToast } from "@/hooks/use-toast";
import type { Chart } from "@shared/schema";

export default function FormResponsesPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [editingChart, setEditingChart] = useState<Chart | undefined>(undefined);

  const { data: form, isLoading: isLoadingForm } = useQuery({
    queryKey: ['/api/forms', id],
    queryFn: () => getForm(id!),
    enabled: !!id,
  });

  const { data: responses, isLoading: isLoadingResponses } = useQuery({
    queryKey: ['/api/forms', id, 'responses'],
    queryFn: () => getFormResponses(id!),
    enabled: !!id,
  });

  const { data: charts, isLoading: isLoadingCharts } = useQuery<Chart[]>({
    queryKey: ['/api/forms', id, 'charts'],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${id}/charts`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch charts');
      return response.json();
    },
    enabled: !!id,
  });

  const deleteChartMutation = useMutation({
    mutationFn: async (chartId: string) => {
      await apiRequest("DELETE", `/api/charts/${chartId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms', id, 'charts'] });
      toast({
        title: "Gráfico eliminado",
        description: "El gráfico se ha eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el gráfico",
        variant: "destructive",
      });
    },
  });

  if (isLoadingForm || isLoadingResponses) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-responses">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Formulario no encontrado</p>
      </div>
    );
  }

  // Obtener todas las columnas dinámicamente de las respuestas
  const hasFormFields = form.fields && form.fields.length > 0;
  const dynamicColumns: string[] = [];
  const urlParamColumns: string[] = [];
  
  if (!hasFormFields && responses && responses.length > 0) {
    // Si no hay campos del formulario, extraer las columnas de las respuestas
    const allKeys = new Set<string>();
    responses.forEach((response) => {
      const answers = response.answers as Record<string, any>;
      Object.keys(answers).forEach(key => {
        if (key !== 'email') { // Excluir email ya que se muestra en otra columna
          allKeys.add(key);
        }
      });
    });
    dynamicColumns.push(...Array.from(allKeys).sort());
  }
  
  // Extraer columnas de urlParams
  if (responses && responses.length > 0) {
    const allUrlParams = new Set<string>();
    responses.forEach((response) => {
      const params = response.urlParams as Record<string, string> | null;
      if (params) {
        Object.keys(params).forEach(key => allUrlParams.add(key));
      }
    });
    urlParamColumns.push(...Array.from(allUrlParams).sort());
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/forms">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-form-title">{form.title}</h1>
            <p className="text-muted-foreground">Análisis y respuestas del formulario</p>
          </div>
        </div>
        <Button
          variant="default"
          data-testid="button-export"
          onClick={() => window.location.href = getExportUrl(id!)}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar a Excel
        </Button>
      </div>

      <Tabs defaultValue="responses" className="space-y-4">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="responses" data-testid="tab-responses">
            Respuestas ({responses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">
            Gráficos ({charts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="agent" data-testid="tab-agent">
            Agente Analista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Respuestas ({responses?.length || 0})</CardTitle>
              <CardDescription>
                Todas las respuestas enviadas a este formulario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!responses || responses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-responses">
                  No hay respuestas todavía
                </p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Email</TableHead>
                        {hasFormFields ? (
                          form.fields.map((field) => (
                            <TableHead key={field.id}>{field.label}</TableHead>
                          ))
                        ) : (
                          dynamicColumns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))
                        )}
                        {urlParamColumns.map((param) => (
                          <TableHead key={`url-${param}`}>{param}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response) => {
                        const answers = response.answers as Record<string, any>;
                        const params = response.urlParams as Record<string, string> | null;
                        return (
                          <TableRow key={response.id} data-testid={`row-response-${response.id}`}>
                            <TableCell>
                              {response.submittedAt
                                ? format(new Date(response.submittedAt), "dd/MM/yyyy HH:mm", { locale: es })
                                : '-'}
                            </TableCell>
                            <TableCell>{response.respondentEmail || '-'}</TableCell>
                            {hasFormFields ? (
                              form.fields.map((field) => (
                                <TableCell key={field.id}>
                                  {Array.isArray(answers[field.id])
                                    ? answers[field.id].join(', ')
                                    : answers[field.id] || '-'}
                                </TableCell>
                              ))
                            ) : (
                              dynamicColumns.map((column) => (
                                <TableCell key={column}>
                                  {Array.isArray(answers[column])
                                    ? answers[column].join(', ')
                                    : answers[column] || '-'}
                                </TableCell>
                              ))
                            )}
                            {urlParamColumns.map((param) => (
                              <TableCell key={`url-${param}`}>
                                {params?.[param] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="flex justify-end mb-4">
            <ChartBuilder
              formId={id!}
              fields={form.fields || []}
              dynamicFields={dynamicColumns}
              urlParams={urlParamColumns}
              chart={editingChart}
              onClose={() => setEditingChart(undefined)}
            />
          </div>
          
          {isLoadingCharts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : charts && charts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2" data-testid="charts-grid">
              {charts.map((chart) => (
                <ChartRenderer
                  key={chart.id}
                  chart={chart}
                  responses={responses || []}
                  onEdit={(chart) => setEditingChart(chart)}
                  onDelete={(chartId) => deleteChartMutation.mutate(chartId)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground" data-testid="text-no-charts">
                  No hay gráficos todavía. Crea uno para visualizar tus datos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          <ChatAgent formId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
