import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Validate token on mount
  const { data: tokenValidation, isLoading: isValidating } = useQuery({
    queryKey: ['/api/auth/validate-reset-token', token],
    queryFn: async () => {
      if (!token) throw new Error("Token no proporcionado");
      const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
      if (!response.ok) throw new Error("Error al validar el token");
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al restablecer la contraseña");
      }
      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (newPassword.length < 6) {
      setValidationError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return;
    }

    if (!token) {
      setValidationError("Token no válido");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validando enlace...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!token || !tokenValidation?.valid) {
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
                <div className="bg-destructive/10 p-3 rounded-full">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-center">Enlace inválido</CardTitle>
              <CardDescription className="text-center">
                {tokenValidation?.message || "Este enlace no es válido o ha expirado"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="default"
                className="w-full"
                onClick={() => setLocation("/forgot-password")}
                data-testid="button-request-new-link"
              >
                Solicitar nuevo enlace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
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
              <CardTitle className="text-center">¡Contraseña actualizada!</CardTitle>
              <CardDescription className="text-center">
                Tu contraseña se ha restablecido correctamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="text-center">
                  Serás redirigido al inicio de sesión en unos momentos...
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password form
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
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
              </div>

              {validationError && (
                <Alert variant="destructive">
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {resetPasswordMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {(resetPasswordMutation.error as any)?.message || "Error al restablecer la contraseña"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-submit"
              >
                {resetPasswordMutation.isPending ? "Restableciendo..." : "Restablecer contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
