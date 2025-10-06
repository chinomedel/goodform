import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

export default function UsersPage() {
  const { toast } = useToast();
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar rol",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      gestor: "secondary",
      visualizador: "outline",
      cliente: "outline",
    };
    
    const labels: Record<string, string> = {
      admin: "Admin",
      gestor: "Gestor",
      visualizador: "Visualizador",
      cliente: "Cliente",
    };

    return (
      <Badge variant={variants[role] || "outline"} data-testid={`badge-role-${role}`}>
        {labels[role] || role}
      </Badge>
    );
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
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Total de usuarios: {users?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Actual</TableHead>
                <TableHead>Cambiar Rol</TableHead>
                <TableHead>Fecha de Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="font-medium">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "Sin nombre"}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) =>
                        updateRoleMutation.mutate({ userId: user.id, role: newRole })
                      }
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
