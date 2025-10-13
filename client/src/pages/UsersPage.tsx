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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserPlus, Edit, ShieldAlert, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, insertUserSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";

export default function UsersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: setupStatus } = useQuery<{ setupCompleted: boolean; mode: 'saas' | 'self-hosted' }>({
    queryKey: ["/api/setup/status"],
  });

  const isSelfHosted = setupStatus?.mode === 'self-hosted';
  
  const validRoles = isSelfHosted 
    ? ['admin_auto_host', 'visualizador_auto_host']
    : ['super_admin', 'cliente_saas'];

  const createUserFormSchema = useMemo(() => 
    insertUserSchema.extend({
      password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      email: z.string().email("Email inválido"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      roleId: z.string().refine((val) => validRoles.includes(val), {
        message: `Rol inválido. Selecciona uno de los roles válidos: ${validRoles.join(', ')}`,
      }),
    }),
    [validRoles]
  );

  type CreateUserFormData = z.infer<typeof createUserFormSchema>;

  const defaultRoleId = validRoles[0] || 'visualizador_auto_host';

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      roleId: defaultRoleId,
    },
  });

  useEffect(() => {
    if (setupStatus) {
      form.reset({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        roleId: defaultRoleId,
      });
    }
  }, [setupStatus, defaultRoleId, form]);

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
      setIsDialogOpen(false);
      form.reset({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        roleId: defaultRoleId,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { roleId });
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isDeleted, blockReason }: { userId: string; isDeleted?: boolean; blockReason?: 'non_payment' | 'login_attempts' | 'general' | null }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/status`, { isDeleted, blockReason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Estado actualizado",
        description: "El estado del usuario ha sido actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName?: string; lastName?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/name`, { firstName, lastName });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Nombre actualizado",
        description: "El nombre del usuario ha sido actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar nombre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin_auto_host: "default",
      super_admin: "default",
      visualizador_auto_host: "outline",
      cliente_saas: "secondary",
    };
    
    const labels: Record<string, string> = {
      admin_auto_host: "Admin Auto-Host",
      super_admin: "Super Admin",
      visualizador_auto_host: "Visualizador Auto-Host",
      cliente_saas: "Cliente SaaS",
    };

    return (
      <Badge variant={variants[role] || "outline"} data-testid={`badge-role-${role}`}>
        {labels[role] || role}
      </Badge>
    );
  };

  const getStatusBadge = (user: User) => {
    if (user.isDeleted) {
      return (
        <Badge variant="destructive" data-testid={`badge-status-${user.id}`}>
          <Trash2 className="h-3 w-3 mr-1" />
          Eliminado
        </Badge>
      );
    }
    
    if (user.blockReason) {
      const labels: Record<string, string> = {
        non_payment: "Bloqueado - No Pago",
        login_attempts: "Bloqueado - Intentos",
        general: "Bloqueado - General",
      };
      return (
        <Badge variant="destructive" data-testid={`badge-status-${user.id}`}>
          <ShieldAlert className="h-3 w-3 mr-1" />
          {labels[user.blockReason] || "Bloqueado"}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" data-testid={`badge-status-${user.id}`}>
        <ShieldCheck className="h-3 w-3 mr-1" />
        Activo
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Total de usuarios: {users?.length || 0}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-user" disabled={!setupStatus}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-user">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Completa los datos para crear un nuevo usuario en el sistema
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="usuario@ejemplo.com"
                              data-testid="input-email"
                              {...field}
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
                          <FormLabel>Contraseña *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              data-testid="input-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Juan"
                                data-testid="input-firstname"
                                {...field}
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
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Pérez"
                                data-testid="input-lastname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Selecciona un rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {validRoles.includes('admin_auto_host') && (
                                <SelectItem value="admin_auto_host">Admin Auto-Host</SelectItem>
                              )}
                              {validRoles.includes('visualizador_auto_host') && (
                                <SelectItem value="visualizador_auto_host">Visualizador Auto-Host</SelectItem>
                              )}
                              {validRoles.includes('super_admin') && (
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              )}
                              {validRoles.includes('cliente_saas') && (
                                <SelectItem value="cliente_saas">Cliente SaaS</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-3 justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        data-testid="button-submit"
                      >
                        {createUserMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          "Crear Usuario"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                    <TableCell>{getRoleBadge(user.roleId)}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(user);
                          setEditFirstName(user.firstName || "");
                          setEditLastName(user.lastName || "");
                          setEditDialogOpen(true);
                        }}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay usuarios registrados</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Esta es una instalación nueva. Los usuarios aparecerán aquí cuando se registren en el sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Status Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Gestionar el estado y permisos de {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Editar Nombre</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-first-name" className="text-sm text-muted-foreground">
                      Nombre
                    </label>
                    <Input
                      id="edit-first-name"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Nombre"
                      data-testid="input-edit-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-last-name" className="text-sm text-muted-foreground">
                      Apellido
                    </label>
                    <Input
                      id="edit-last-name"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Apellido"
                      data-testid="input-edit-last-name"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => updateNameMutation.mutate({ 
                    userId: selectedUser.id, 
                    firstName: editFirstName, 
                    lastName: editLastName 
                  })}
                  disabled={updateNameMutation.isPending}
                  className="w-full"
                  data-testid="button-save-name"
                >
                  {updateNameMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Nombre"
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Cambiar Rol</h3>
                <Select
                  value={selectedUser.roleId}
                  onValueChange={(newRoleId) =>
                    updateRoleMutation.mutate({ userId: selectedUser.id, roleId: newRoleId })
                  }
                  disabled={updateRoleMutation.isPending}
                >
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_auto_host">Admin Auto-Host</SelectItem>
                    <SelectItem value="visualizador_auto_host">Visualizador Auto-Host</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="cliente_saas">Cliente SaaS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Estado del Usuario</h3>
                <div className="grid gap-2">
                  <Button
                    variant={!selectedUser.isDeleted && !selectedUser.blockReason ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => updateStatusMutation.mutate({ 
                      userId: selectedUser.id, 
                      isDeleted: false, 
                      blockReason: null 
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-activate"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Activo
                  </Button>
                  <Button
                    variant={selectedUser.blockReason === 'non_payment' ? "destructive" : "outline"}
                    className="justify-start"
                    onClick={() => updateStatusMutation.mutate({ 
                      userId: selectedUser.id, 
                      isDeleted: false,
                      blockReason: 'non_payment' 
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-block-payment"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Bloquear por No Pago
                  </Button>
                  <Button
                    variant={selectedUser.blockReason === 'login_attempts' ? "destructive" : "outline"}
                    className="justify-start"
                    onClick={() => updateStatusMutation.mutate({ 
                      userId: selectedUser.id, 
                      isDeleted: false,
                      blockReason: 'login_attempts' 
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-block-attempts"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Bloquear por Intentos de Inicio
                  </Button>
                  <Button
                    variant={selectedUser.blockReason === 'general' ? "destructive" : "outline"}
                    className="justify-start"
                    onClick={() => updateStatusMutation.mutate({ 
                      userId: selectedUser.id, 
                      isDeleted: false,
                      blockReason: 'general' 
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-block-general"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Bloqueo General
                  </Button>
                  <Button
                    variant={selectedUser.isDeleted ? "destructive" : "outline"}
                    className="justify-start"
                    onClick={() => updateStatusMutation.mutate({ 
                      userId: selectedUser.id, 
                      isDeleted: true,
                      blockReason: null 
                    })}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Usuario
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
