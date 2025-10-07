import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getForm, getFormResponses, getExportUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FormResponsesPage() {
  const { id } = useParams();

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
            <p className="text-muted-foreground">Respuestas del formulario</p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => {
                    const answers = response.answers as Record<string, any>;
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
