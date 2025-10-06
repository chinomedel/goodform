import { StatsCard } from "@/components/StatsCard";
import { Card } from "@/components/ui/card";
import { FileText, Users, BarChart3, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const responseData = [
    { name: "Lun", respuestas: 45 },
    { name: "Mar", respuestas: 52 },
    { name: "Mie", respuestas: 38 },
    { name: "Jue", respuestas: 65 },
    { name: "Vie", respuestas: 72 },
    { name: "Sab", respuestas: 28 },
    { name: "Dom", respuestas: 15 },
  ];

  const formDistribution = [
    { name: "Publicados", value: 18 },
    { name: "Borradores", value: 6 },
  ];

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Análisis y estadísticas de tus formularios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Formularios"
            value={24}
            icon={FileText}
            trend={{ value: 12, label: "vs mes anterior" }}
          />
          <StatsCard
            title="Respuestas Totales"
            value="1,234"
            icon={BarChart3}
            trend={{ value: 8, label: "esta semana" }}
          />
          <StatsCard
            title="Usuarios Activos"
            value={56}
            icon={Users}
            trend={{ value: -3, label: "vs semana pasada" }}
          />
          <StatsCard
            title="Tasa de Completado"
            value="87%"
            icon={CheckCircle}
            trend={{ value: 5, label: "vs mes anterior" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Respuestas por Día</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="respuestas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Distribución de Formularios</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Formularios Más Populares</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: "Satisfacción", respuestas: 142 },
                { name: "Feedback", respuestas: 87 },
                { name: "Registro", respuestas: 65 },
                { name: "Vacaciones", respuestas: 45 },
                { name: "Contacto", respuestas: 32 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="respuestas" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
