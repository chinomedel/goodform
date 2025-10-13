import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Shield, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UsageReportsPage() {
  const { user } = useAuth();

  // Check if user is admin (super_admin or admin_auto_host)
  const isAdmin = user?.isSuperAdmin || user?.roleId === 'admin_auto_host' || user?.roleId === 'super_admin';

  const { data: loginStats, isLoading: isLoadingLogins } = useQuery<{ date: string; count: number }[]>({
    queryKey: ["/api/reports/logins"],
    queryFn: async () => {
      const res = await fetch("/api/reports/logins?days=30", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Error al obtener estadísticas de inicio de sesión");
      return res.json();
    }
  });

  const { data: passwordResetStats, isLoading: isLoadingResets } = useQuery<{ date: string; count: number }[]>({
    queryKey: ["/api/reports/password-resets"],
    queryFn: async () => {
      const res = await fetch("/api/reports/password-resets?days=30", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Error al obtener estadísticas de recuperación de contraseñas");
      return res.json();
    }
  });

  const isLoading = isLoadingLogins || isLoadingResets;

  // Check authorization first
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta sección. Esta página está disponible solo para Super Admin y Admin Auto-host.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Format data for charts
  const loginChartData = loginStats?.map(stat => ({
    date: format(parseISO(stat.date), 'dd MMM', { locale: es }),
    logins: stat.count,
  })).reverse() || [];

  const passwordResetChartData = passwordResetStats?.map(stat => ({
    date: format(parseISO(stat.date), 'dd MMM', { locale: es }),
    resets: stat.count,
  })).reverse() || [];

  // Calculate totals
  const totalLogins = loginStats?.reduce((sum, stat) => sum + stat.count, 0) || 0;
  const totalPasswordResets = passwordResetStats?.reduce((sum, stat) => sum + stat.count, 0) || 0;

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
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">Reportes de Uso de Aplicación</h1>
          <p className="text-muted-foreground">
            Estadísticas de uso de la plataforma (últimos 30 días)
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Inicios de Sesión
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-logins">{totalLogins}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recuperaciones de Contraseña
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-resets">{totalPasswordResets}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Login Statistics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Inicios de Sesión por Día</CardTitle>
          <CardDescription>
            Cantidad de usuarios que han iniciado sesión cada día
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={loginChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  name="Inicios de Sesión"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No hay datos de inicios de sesión en los últimos 30 días
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Statistics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recuperaciones de Contraseña por Día</CardTitle>
          <CardDescription>
            Cantidad de solicitudes de recuperación de contraseña cada día
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordResetChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={passwordResetChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="resets" 
                  name="Recuperaciones"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No hay datos de recuperaciones de contraseña en los últimos 30 días
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
