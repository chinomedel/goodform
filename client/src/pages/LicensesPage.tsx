import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Key, Plus, Copy, Check, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type License = {
  id: string;
  licenseKey: string;
  issuedToEmail: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "revoked" | "expired";
  deploymentInfo?: any;
};

const licenseFormSchema = z.object({
  issuedToEmail: z.string().email("Email inválido"),
  expiresAt: z.string().min(1, "Fecha de expiración requerida"),
  notes: z.string().optional(),
});

type LicenseFormData = z.infer<typeof licenseFormSchema>;

export default function LicensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Verificar que el usuario es super admin
  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              Solo los super administradores pueden acceder a la gestión de licencias.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseFormSchema),
    defaultValues: {
      issuedToEmail: "",
      expiresAt: "",
      notes: "",
    },
  });

  // Query para obtener licencias
  const { data: licenses, isLoading } = useQuery<License[]>({
    queryKey: ["/api/admin/licenses"],
  });

  // Mutation para crear licencia
  const createLicenseMutation = useMutation({
    mutationFn: async (data: LicenseFormData) => {
      const response = await apiRequest("POST", "/api/admin/licenses/issue", data);
      const result = await response.json();
      return result as License;
    },
    onSuccess: (data: License) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      toast({
        title: "Licencia Generada",
        description: `Código: ${data.licenseKey}`,
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar la licencia",
      });
    },
  });

  // Mutation para revocar licencia
  const revokeLicenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/admin/licenses/${id}/revoke`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      toast({
        title: "Licencia Revocada",
        description: "La licencia ha sido revocada exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo revocar la licencia",
      });
    },
  });

  const onSubmit = (data: LicenseFormData) => {
    createLicenseMutation.mutate(data);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: "Copiado",
      description: "Código de licencia copiado al portapapeles",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500" data-testid={`badge-status-active`}>Activa</Badge>;
      case "revoked":
        return <Badge variant="destructive" data-testid={`badge-status-revoked`}>Revocada</Badge>;
      case "expired":
        return <Badge variant="secondary" data-testid={`badge-status-expired`}>Expirada</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const activeLicensesCount = licenses?.filter(l => l.status === "active").length || 0;
  const revokedLicensesCount = licenses?.filter(l => l.status === "revoked").length || 0;

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Key className="h-8 w-8" />
              Gestión de Licencias
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Genera y administra códigos de licencia para instalaciones Auto-Host
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-license">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Licencia
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-new-license">
              <DialogHeader>
                <DialogTitle>Generar Nueva Licencia</DialogTitle>
                <DialogDescription>
                  Crea un código de licencia para un cliente Auto-Host
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="issuedToEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email del Cliente</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="cliente@ejemplo.com"
                            data-testid="input-license-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Expiración</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            data-testid="input-license-expiration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Información adicional sobre esta licencia..."
                            data-testid="input-license-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLicenseMutation.isPending}
                      className="flex-1"
                      data-testid="button-generate-license"
                    >
                      {createLicenseMutation.isPending ? "Generando..." : "Generar Licencia"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Licencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-total-licenses">
                {licenses?.length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Licencias Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600" data-testid="text-active-licenses">
                {activeLicensesCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Licencias Revocadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600" data-testid="text-revoked-licenses">
                {revokedLicensesCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Licencias */}
        <Card>
          <CardHeader>
            <CardTitle>Licencias Emitidas</CardTitle>
            <CardDescription>
              Historial completo de códigos de licencia generados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
                Cargando licencias...
              </div>
            ) : licenses && licenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código de Licencia</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Emitido Por</TableHead>
                      <TableHead>Fecha Emisión</TableHead>
                      <TableHead>Expiración</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id} data-testid={`row-license-${license.id}`}>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" data-testid={`text-license-key-${license.id}`}>
                              {license.licenseKey}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(license.licenseKey, license.id)}
                              data-testid={`button-copy-${license.id}`}
                            >
                              {copiedKey === license.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-email-${license.id}`}>
                          {license.issuedToEmail}
                        </TableCell>
                        <TableCell data-testid={`text-issued-by-${license.id}`}>
                          {license.issuedBy}
                        </TableCell>
                        <TableCell data-testid={`text-issued-at-${license.id}`}>
                          {format(new Date(license.issuedAt), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell data-testid={`text-expires-at-${license.id}`}>
                          {format(new Date(license.expiresAt), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>{getStatusBadge(license.status)}</TableCell>
                        <TableCell className="text-right">
                          {license.status === "active" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => revokeLicenseMutation.mutate(license.id)}
                              disabled={revokeLicenseMutation.isPending}
                              data-testid={`button-revoke-${license.id}`}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Revocar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12" data-testid="text-empty-state">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay licencias generadas aún
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Haz clic en "Nueva Licencia" para generar tu primera licencia
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
