import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const setupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  licenseKey: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showLicense, setShowLicense] = useState(false);

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      licenseKey: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: SetupFormData) => {
      const response = await apiRequest("POST", "/api/setup", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        licenseKey: data.licenseKey,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Setup completado",
        description: "Ahora puedes iniciar sesión con tus credenciales",
      });
      setLocation("/auth");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al completar el setup",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SetupFormData) => {
    setupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="text-setup-title">Configuración Inicial</CardTitle>
          <CardDescription>
            Crea la cuenta de administrador para tu instalación de GoodForm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@ejemplo.com"
                        data-testid="input-setup-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-setup-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-setup-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Juan"
                        data-testid="input-setup-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Pérez"
                        data-testid="input-setup-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLicense(!showLicense)}
                  className="w-full"
                  data-testid="button-toggle-license"
                >
                  {showLicense ? "Omitir licencia" : "Tengo una licencia"}
                </Button>

                {showLicense && (
                  <FormField
                    control={form.control}
                    name="licenseKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Licencia</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ABC-123-XYZ"
                            data-testid="input-setup-license-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={setupMutation.isPending}
                data-testid="button-complete-setup"
              >
                {setupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completando setup...
                  </>
                ) : (
                  "Completar Setup"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
