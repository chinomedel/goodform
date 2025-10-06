import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getForms } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, BarChart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: getDashboardStats,
  });

  const { data: forms, isLoading: isLoadingForms } = useQuery({
    queryKey: ['/api/forms'],
    queryFn: getForms,
  });

  const recentForms = forms?.slice(0, 5) || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Resumen de tu actividad</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Formularios</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-forms">
              {isLoadingStats ? '-' : stats?.totalForms || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formularios Publicados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-published-forms">
              {isLoadingStats ? '-' : stats?.publishedForms || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-draft-forms">
              {isLoadingStats ? '-' : stats?.draftForms || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Respuestas</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-responses">
              {isLoadingStats ? '-' : stats?.totalResponses || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1">
          <div>
            <CardTitle>Formularios Recientes</CardTitle>
          </div>
          <Link href="/forms">
            <Button variant="outline" size="sm" data-testid="button-view-all">
              Ver todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingForms ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : recentForms.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No hay formularios</h3>
                <p className="text-muted-foreground">Crea tu primer formulario para comenzar</p>
              </div>
              <Link href="/builder">
                <Button data-testid="button-create-first">Crear formulario</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Respuestas</TableHead>
                  <TableHead>Última actualización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentForms.map((form) => (
                  <TableRow key={form.id} data-testid={`row-form-${form.id}`}>
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell>
                      <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                        {form.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </TableCell>
                    <TableCell>{form.responseCount || 0}</TableCell>
                    <TableCell>
                      {form.updatedAt
                        ? format(new Date(form.updatedAt), "dd/MM/yyyy", { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/builder/${form.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${form.id}`}>
                            Editar
                          </Button>
                        </Link>
                        {form.status === 'published' && (
                          <Link href={`/responses/${form.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-responses-${form.id}`}>
                              Ver respuestas
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
