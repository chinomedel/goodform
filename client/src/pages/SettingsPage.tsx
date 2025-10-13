import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings as SettingsIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppConfig } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const configSchema = z.object({
  appName: z.string().min(1, "El nombre de la aplicación es requerido"),
  logoUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  faviconUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Debe ser un color hexadecimal válido (ej: #6366f1)"),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  
  const { data: config, isLoading } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    values: config ? {
      appName: config.appName || "GoodForm",
      logoUrl: config.logoUrl ?? "",
      faviconUrl: config.faviconUrl ?? "",
      primaryColor: config.primaryColor || "#6366f1",
    } : undefined,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: ConfigFormValues) => {
      const res = await apiRequest("PATCH", "/api/config", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public-config"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar configuración",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfigFormValues) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">Configuración</h1>
          <p className="text-muted-foreground">
            Configura la apariencia y branding de la aplicación
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración General de la Aplicación</CardTitle>
          <CardDescription>
            Personaliza el nombre, logo y colores de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Aplicación</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="GoodForm" 
                        data-testid="input-app-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Este nombre aparecerá en el título y en toda la aplicación
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Logo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://ejemplo.com/logo.png" 
                        data-testid="input-logo-url"
                      />
                    </FormControl>
                    <FormDescription>
                      URL pública del logo de la aplicación (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("logoUrl") && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-md">
                  <img 
                    src={form.watch("logoUrl")} 
                    alt="Logo preview" 
                    className="h-16 w-16 object-contain"
                    data-testid="img-logo-preview"
                  />
                  <span className="text-sm text-muted-foreground">Vista previa del logo</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="faviconUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Favicon</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://ejemplo.com/favicon.ico" 
                        data-testid="input-favicon-url"
                      />
                    </FormControl>
                    <FormDescription>
                      URL pública del favicon (ícono de pestaña) (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("faviconUrl") && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-md">
                  <img 
                    src={form.watch("faviconUrl")} 
                    alt="Favicon preview" 
                    className="h-8 w-8 object-contain"
                    data-testid="img-favicon-preview"
                  />
                  <span className="text-sm text-muted-foreground">Vista previa del favicon</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Primario</FormLabel>
                    <div className="flex gap-3 items-start">
                      <FormControl>
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <input
                              type="color"
                              {...field}
                              className="h-10 w-20 cursor-pointer rounded-md border border-border"
                              data-testid="input-color-picker"
                            />
                            <Input 
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="#6366f1" 
                              data-testid="input-primary-color"
                              className="flex-1"
                            />
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {['#6366f1', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'].map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className="h-8 w-full rounded-md border-2 hover-elevate active-elevate-2"
                                style={{ 
                                  backgroundColor: color,
                                  borderColor: field.value === color ? '#000' : 'transparent'
                                }}
                                data-testid={`color-preset-${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <div 
                        className="w-16 h-16 rounded-md border border-border flex-shrink-0"
                        style={{ backgroundColor: field.value }}
                        data-testid="color-preview"
                      />
                    </div>
                    <FormDescription>
                      Selecciona un color de la paleta, usa el selector de color, o ingresa un código hexadecimal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {updateConfigMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información Adicional</CardTitle>
          <CardDescription>
            Detalles sobre la configuración de auto-hosting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Esta aplicación está diseñada para ser auto-hospedada. Los cambios de configuración
            se aplicarán inmediatamente para todos los usuarios.
          </p>
          <p>
            <strong>Nota sobre las imágenes:</strong> Para el logo y favicon, debes subir las imágenes
            a un servicio de hosting externo (como Imgur, Cloudinary, o tu propio servidor) y pegar
            las URLs públicas en los campos correspondientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
