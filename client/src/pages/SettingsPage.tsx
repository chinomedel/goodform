import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Shield } from "lucide-react";
import { RoleBadge } from "@/components/RoleBadge";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">Configuración</h1>
          <p className="text-muted-foreground">
            Administra tu cuenta y preferencias del sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Perfil del Usuario */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Información Personal</CardTitle>
            </div>
            <CardDescription>
              Actualiza tu información de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={profileData.firstName}
                onChange={(e) =>
                  setProfileData({ ...profileData, firstName: e.target.value })
                }
                placeholder="Tu nombre"
                data-testid="input-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={profileData.lastName}
                onChange={(e) =>
                  setProfileData({ ...profileData, lastName: e.target.value })
                }
                placeholder="Tu apellido"
                data-testid="input-lastname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede cambiar
              </p>
            </div>
            <Button className="w-full" disabled data-testid="button-save-profile">
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Información de la Cuenta */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Información de la Cuenta</CardTitle>
            </div>
            <CardDescription>
              Detalles de tu cuenta y permisos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rol actual</Label>
              <div>
                <RoleBadge role={user?.role || "gestor"} />
              </div>
              <p className="text-xs text-muted-foreground">
                Tu rol determina los permisos en el sistema
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Fecha de registro</Label>
              <p className="text-sm">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>ID de usuario</Label>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {user?.id}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>
              Gestiona la seguridad de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                disabled
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                disabled
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled
                data-testid="input-confirm-password"
              />
            </div>
            <Button className="w-full" disabled data-testid="button-change-password">
              Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
            <CardDescription>
              Personaliza tu experiencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por email</Label>
                <p className="text-xs text-muted-foreground">
                  Recibe notificaciones sobre nuevas respuestas
                </p>
              </div>
              <Button variant="outline" size="sm" disabled data-testid="button-toggle-notifications">
                Desactivado
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Idioma</Label>
                <p className="text-xs text-muted-foreground">
                  Idioma de la interfaz
                </p>
              </div>
              <Button variant="outline" size="sm" disabled data-testid="button-language">
                Español
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
