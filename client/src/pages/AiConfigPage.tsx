import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, FlaskConical, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiConfig } from "@shared/schema";

export default function AiConfigPage() {
  const { toast } = useToast();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");

  const { data: aiConfig, isLoading } = useQuery<AiConfig>({
    queryKey: ['/api/ai-config'],
  });

  const { data: keysStatus } = useQuery<{ openai: boolean; deepseek: boolean }>({
    queryKey: ['/api/ai-config/keys-status'],
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

  const updateKeysMutation = useMutation({
    mutationFn: async (data: { openaiApiKey?: string; deepseekApiKey?: string }) => {
      const response = await apiRequest("POST", "/api/ai-config/update-keys", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-config/keys-status'] });
      setOpenaiKey("");
      setDeepseekKey("");
      toast({
        title: "API Keys actualizadas",
        description: "Las API keys han sido guardadas de forma segura",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar las API keys",
        variant: "destructive",
      });
    },
  });

  const handleTest = (provider: string) => {
    setTestingProvider(provider);
    testProviderMutation.mutate(provider);
  };

  const handleSaveKeys = () => {
    const data: any = {};
    if (openaiKey.trim()) data.openaiApiKey = openaiKey.trim();
    if (deepseekKey.trim()) data.deepseekApiKey = deepseekKey.trim();
    
    if (Object.keys(data).length === 0) {
      toast({
        title: "Aviso",
        description: "Ingresa al menos una API key para guardar",
        variant: "destructive",
      });
      return;
    }
    
    updateKeysMutation.mutate(data);
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
              <strong>Nota:</strong> Selecciona el proveedor que deseas usar y configura sus API keys a continuación.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurar API Keys</CardTitle>
          <CardDescription>
            Ingresa las API keys para los proveedores de IA. Se almacenarán de forma segura encriptadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                data-testid="input-openai-key"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Obtén tu API key en <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deepseek-key">Deepseek API Key</Label>
            <div className="flex gap-2">
              <Input
                id="deepseek-key"
                type="password"
                placeholder="sk-..."
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                data-testid="input-deepseek-key"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Obtén tu API key en <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="underline">platform.deepseek.com</a>
            </p>
          </div>

          <Button
            onClick={handleSaveKeys}
            disabled={updateKeysMutation.isPending}
            className="w-full"
            data-testid="button-save-keys"
          >
            {updateKeysMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar API Keys
              </>
            )}
          </Button>
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
              {keysStatus?.openai ? (
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
              {keysStatus?.deepseek ? (
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
