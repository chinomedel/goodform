import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiConfig } from "@shared/schema";

export default function AiConfigPage() {
  const { toast } = useToast();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const { data: aiConfig, isLoading } = useQuery<AiConfig>({
    queryKey: ['/api/ai-config'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (provider: 'openai' | 'deepseek') => {
      const response = await apiRequest("PATCH", "/api/ai-config", { activeProvider: provider });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-config'] });
      toast({
        title: "Configuración actualizada",
        description: "El proveedor de IA ha sido actualizado exitosamente",
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

  const testProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await apiRequest("POST", `/api/ai-config/test/${provider}`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "✓ Prueba exitosa" : "✗ Prueba fallida",
        description: data.message + (data.details ? `\n${data.details}` : ''),
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
      setTestingProvider(null);
    },
  });

  const handleTest = (provider: string) => {
    setTestingProvider(provider);
    testProviderMutation.mutate(provider);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-ai-config">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Configuración de IA</h1>
        <p className="text-muted-foreground">Configura y prueba los proveedores de inteligencia artificial</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proveedor de IA Activo</CardTitle>
          <CardDescription>
            Selecciona qué proveedor de IA utilizar en la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={aiConfig?.activeProvider || 'openai'}
            onValueChange={(value) => updateConfigMutation.mutate(value as 'openai' | 'deepseek')}
            disabled={updateConfigMutation.isPending}
            data-testid="radio-group-provider"
          >
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="openai" id="openai" data-testid="radio-openai" />
                <Label htmlFor="openai" className="cursor-pointer">
                  <div className="font-medium">OpenAI</div>
                  <div className="text-sm text-muted-foreground">GPT-3.5, GPT-4, GPT-5</div>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {aiConfig?.activeProvider === 'openai' && (
                  <Badge variant="default" data-testid="badge-active-openai">Activo</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest('openai')}
                  disabled={testingProvider === 'openai'}
                  data-testid="button-test-openai"
                >
                  {testingProvider === 'openai' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-3 w-3 mr-2" />
                      Probar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="deepseek" id="deepseek" data-testid="radio-deepseek" />
                <Label htmlFor="deepseek" className="cursor-pointer">
                  <div className="font-medium">Deepseek</div>
                  <div className="text-sm text-muted-foreground">Deepseek Chat</div>
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {aiConfig?.activeProvider === 'deepseek' && (
                  <Badge variant="default" data-testid="badge-active-deepseek">Activo</Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest('deepseek')}
                  disabled={testingProvider === 'deepseek'}
                  data-testid="button-test-deepseek"
                >
                  {testingProvider === 'deepseek' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-3 w-3 mr-2" />
                      Probar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </RadioGroup>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Nota:</strong> Las API keys se configuran de forma segura a través de las variables de entorno.
              Asegúrate de tener configuradas OPENAI_API_KEY y DEEPSEEK_API_KEY en los secretos de Replit.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de las Conexiones</CardTitle>
          <CardDescription>
            Verifica que las API keys estén correctamente configuradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">OpenAI API Key</div>
            </div>
            <div className="flex items-center gap-2">
              {process.env.OPENAI_API_KEY ? (
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
              <div className="text-sm font-medium">Deepseek API Key</div>
            </div>
            <div className="flex items-center gap-2">
              {process.env.DEEPSEEK_API_KEY ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
