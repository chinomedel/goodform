import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, DollarSign, AlertCircle, Settings } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface AiUsageStats {
  totalTokens: number;
  totalCost: number;
  byProvider: { provider: string; tokens: number; cost: number }[];
  byDay: { date: string; tokens: number; cost: number }[];
}

export default function AiReportsPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [provider, setProvider] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [openaiPrice, setOpenaiPrice] = useState<string>("");
  const [deepseekPrice, setDeepseekPrice] = useState<string>("");

  const isAdmin = user?.isSuperAdmin || user?.roleId === 'admin_auto_host' || user?.roleId === 'super_admin';

  const startDate = subDays(new Date(), parseInt(dateRange));
  const endDate = new Date();

  const { data: stats, isLoading: isLoadingStats } = useQuery<AiUsageStats>({
    queryKey: ["/api/ai-usage/stats", provider, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (provider !== "all") params.append("provider", provider);
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());

      const res = await fetch(`/api/ai-usage/stats?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Error al obtener estadísticas de uso de IA");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: pricing, isLoading: isLoadingPricing } = useQuery<{ openaiPricePerMillion: number; deepseekPricePerMillion: number }>({
    queryKey: ["/api/ai-usage/pricing"],
    queryFn: async () => {
      const res = await fetch("/api/ai-usage/pricing", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Error al obtener precios de IA");
      return res.json();
    },
    enabled: isAdmin,
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (data: { openaiPrice?: number; deepseekPrice?: number }) => {
      return await apiRequest("/api/ai-usage/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-usage/pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-usage/stats"] });
      toast({
        title: "Precios actualizados",
        description: "Los precios por millón de tokens han sido actualizados exitosamente",
      });
      setOpenaiPrice("");
      setDeepseekPrice("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los precios",
        variant: "destructive",
      });
    },
  });

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loading-auth" />
      </div>
    );
  }

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

  const isLoading = isLoadingStats || isLoadingPricing;

  const dailyChartData = stats?.byDay.map(stat => ({
    date: format(parseISO(stat.date), 'dd MMM', { locale: es }),
    tokens: Math.round(stat.tokens / 1000),
    costo: stat.cost,
  })).reverse() || [];

  const providerChartData = stats?.byProvider.map(stat => ({
    name: stat.provider === 'openai' ? 'OpenAI' : 'DeepSeek',
    tokens: Math.round(stat.tokens / 1000),
    costo: stat.cost,
  })) || [];

  const handleUpdatePricing = () => {
    const data: { openaiPrice?: number; deepseekPrice?: number } = {};
    if (openaiPrice) data.openaiPrice = parseFloat(openaiPrice);
    if (deepseekPrice) data.deepseekPrice = parseFloat(deepseekPrice);
    
    if (Object.keys(data).length > 0) {
      updatePricingMutation.mutate(data);
    }
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
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold">Reportes de Uso de IA</h1>
          <p className="text-muted-foreground">
            Estadísticas de consumo de tokens y costos estimados
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="provider-filter">Proveedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider-filter" data-testid="select-provider">
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="date-range-filter">Período</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range-filter" data-testid="select-date-range">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Tokens Usados
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tokens">
              {stats?.totalTokens.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {provider === "all" ? "Todos los proveedores" : provider === "openai" ? "OpenAI" : "DeepSeek"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Costo Estimado Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cost">
              ${(stats?.totalCost || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos {dateRange} días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Uso Diario de Tokens</CardTitle>
          <CardDescription>
            Tokens consumidos por día (en miles)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData}>
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
                  dataKey="tokens" 
                  name="Tokens (miles)"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="costo" 
                  name="Costo (USD)"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No hay datos de uso en el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Distribution */}
      {provider === "all" && providerChartData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Proveedor (Tokens)</CardTitle>
              <CardDescription>
                Tokens consumidos por cada proveedor (en miles)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={providerChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
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
                  />
                  <Bar dataKey="tokens" name="Tokens (miles)" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Proveedor (Costos)</CardTitle>
              <CardDescription>
                Costo estimado por cada proveedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={providerChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, costo }) => `${name}: $${costo}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="costo"
                  >
                    {providerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Precios</CardTitle>
          <CardDescription>
            Actualizar costo por millón de tokens para cada proveedor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="openai-price">OpenAI - Precio por millón (USD)</Label>
              <div className="flex gap-2">
                <Input
                  id="openai-price"
                  data-testid="input-openai-price"
                  type="number"
                  placeholder={`Actual: $${pricing?.openaiPricePerMillion || 0}`}
                  value={openaiPrice}
                  onChange={(e) => setOpenaiPrice(e.target.value)}
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Precio actual: ${pricing?.openaiPricePerMillion || 0} por millón de tokens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepseek-price">DeepSeek - Precio por millón (USD)</Label>
              <div className="flex gap-2">
                <Input
                  id="deepseek-price"
                  data-testid="input-deepseek-price"
                  type="number"
                  placeholder={`Actual: $${pricing?.deepseekPricePerMillion || 0}`}
                  value={deepseekPrice}
                  onChange={(e) => setDeepseekPrice(e.target.value)}
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Precio actual: ${pricing?.deepseekPricePerMillion || 0} por millón de tokens
              </p>
            </div>
          </div>

          <Button
            onClick={handleUpdatePricing}
            disabled={updatePricingMutation.isPending || (!openaiPrice && !deepseekPrice)}
            data-testid="button-update-pricing"
          >
            {updatePricingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar Precios"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
