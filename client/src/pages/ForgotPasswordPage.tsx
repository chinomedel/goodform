import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: () => {
      setShowSuccess(true);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(email);
  };

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2 text-foreground">GoodForm</h1>
            <p className="text-muted-foreground">
              Gestión de formularios profesional
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-center">¡Revisa tu correo!</CardTitle>
              <CardDescription className="text-center">
                Hemos enviado un enlace para restablecer tu contraseña
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Si existe una cuenta con el correo <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center">
                Revisa también tu carpeta de spam o correo no deseado.
              </p>
              <Link href="/auth">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-foreground">GoodForm</h1>
          <p className="text-muted-foreground">
            Gestión de formularios profesional
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription>
              Ingresa tu email y te enviaremos un enlace para restablecerla
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-forgot-email"
                />
              </div>

              {forgotPasswordMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {(forgotPasswordMutation.error as any)?.message || "Error al procesar la solicitud"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-forgot-submit"
              >
                {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar enlace de restablecimiento"}
              </Button>

              <Link href="/auth">
                <Button variant="ghost" className="w-full" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
