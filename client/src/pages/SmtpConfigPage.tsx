import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, FlaskConical, Save, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SmtpConfig } from "@shared/schema";

export default function SmtpConfigPage() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  const { data: smtpConfig, isLoading } = useQuery<SmtpConfig>({
    queryKey: ['/api/smtp-config'],
  });

  const { data: credentialsStatus } = useQuery<{ hasUser: boolean; hasPassword: boolean }>({
    queryKey: ['/api/smtp-config/credentials-status'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<SmtpConfig>) => {
      const response = await apiRequest("PATCH", "/api/smtp-config", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-config'] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración SMTP ha sido actualizada exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/smtp-config/test", {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "✓ Prueba exitosa" : "✗ Prueba fallida",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la prueba",
        description: error.message || "No se pudo completar la prueba",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTesting(false);
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: { user?: string; password?: string }) => {
      const response = await apiRequest("POST", "/api/smtp-config/update-credentials", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-config/credentials-status'] });
      setSmtpUser("");
      setSmtpPassword("");
      toast({
        title: "Credenciales actualizadas",
        description: "Las credenciales SMTP han sido guardadas de forma segura",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar las credenciales",
        variant: "destructive",
      });
    },
  });

  const handleTest = () => {
    setIsTesting(true);
    testConnectionMutation.mutate();
  };

  const handleSaveCredentials = () => {
    const data: any = {};
    if (smtpUser.trim()) data.user = smtpUser.trim();
    if (smtpPassword.trim()) data.password = smtpPassword.trim();
    
    if (Object.keys(data).length === 0) {
      toast({
        title: "Aviso",
        description: "Ingresa al menos un campo para guardar",
        variant: "destructive",
      });
      return;
    }
    
    updateCredentialsMutation.mutate(data);
  };

  const handleUpdateConfig = (field: string, value: any) => {
    updateConfigMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-smtp-config">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Configuración SMTP</h1>
          <p className="text-muted-foreground">Configura el servidor de correo electrónico para envío de notificaciones</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Servidor SMTP</CardTitle>
          <CardDescription>
            Configura los detalles de conexión del servidor de correo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Host SMTP</Label>
              <Input
                id="smtp-host"
                type="text"
                placeholder="smtp.gmail.com"
                defaultValue={smtpConfig?.host}
                onBlur={(e) => handleUpdateConfig('host', e.target.value)}
                data-testid="input-smtp-host"
              />
              <p className="text-xs text-muted-foreground">
                Dirección del servidor SMTP
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                defaultValue={smtpConfig?.port}
                onBlur={(e) => handleUpdateConfig('port', parseInt(e.target.value))}
                data-testid="input-smtp-port"
              />
              <p className="text-xs text-muted-foreground">
                Puerto del servidor (587 o 465)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="smtp-secure">Conexión Segura (SSL/TLS)</Label>
              <p className="text-sm text-muted-foreground">
                Activa para conexiones seguras (puerto 465)
              </p>
            </div>
            <Switch
              id="smtp-secure"
              checked={smtpConfig?.secure || false}
              onCheckedChange={(checked) => handleUpdateConfig('secure', checked)}
              data-testid="switch-smtp-secure"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">Email Remitente</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="noreply@ejemplo.com"
                defaultValue={smtpConfig?.fromEmail}
                onBlur={(e) => handleUpdateConfig('fromEmail', e.target.value)}
                data-testid="input-smtp-from-email"
              />
              <p className="text-xs text-muted-foreground">
                Email que aparecerá como remitente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">Nombre Remitente</Label>
              <Input
                id="smtp-from-name"
                type="text"
                placeholder="Mi Aplicación"
                defaultValue={smtpConfig?.fromName}
                onBlur={(e) => handleUpdateConfig('fromName', e.target.value)}
                data-testid="input-smtp-from-name"
              />
              <p className="text-xs text-muted-foreground">
                Nombre que aparecerá como remitente
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Nota:</strong> Los campos se guardan automáticamente al salir de cada campo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciales de Autenticación</CardTitle>
          <CardDescription>
            Ingresa las credenciales para autenticación SMTP. Se almacenarán de forma segura encriptadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-user">Usuario SMTP</Label>
            <Input
              id="smtp-user"
              type="text"
              placeholder="usuario@ejemplo.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              data-testid="input-smtp-user"
            />
            <p className="text-xs text-muted-foreground">
              Normalmente es tu dirección de email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-password">Contraseña SMTP</Label>
            <Input
              id="smtp-password"
              type="password"
              placeholder="••••••••"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              data-testid="input-smtp-password"
            />
            <p className="text-xs text-muted-foreground">
              Contraseña o App Password de tu cuenta
            </p>
          </div>

          <Button
            onClick={handleSaveCredentials}
            disabled={updateCredentialsMutation.isPending}
            className="w-full"
            data-testid="button-save-credentials"
          >
            {updateCredentialsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Credenciales
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Probar Conexión</CardTitle>
          <CardDescription>
            Verifica que la configuración SMTP esté correctamente establecida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Credenciales Usuario</div>
            </div>
            <div className="flex items-center gap-2">
              {credentialsStatus?.hasUser ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Configurada</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">No configurada</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Credenciales Contraseña</div>
            </div>
            <div className="flex items-center gap-2">
              {credentialsStatus?.hasPassword ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Configurada</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">No configurada</span>
                </>
              )}
            </div>
          </div>

          <Button
            onClick={handleTest}
            disabled={isTesting}
            className="w-full"
            variant="outline"
            data-testid="button-test-connection"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Probando conexión...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4 mr-2" />
                Probar Conexión SMTP
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
