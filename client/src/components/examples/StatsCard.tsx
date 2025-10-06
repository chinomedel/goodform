import { StatsCard } from "../StatsCard";
import { FileText, Users, BarChart3, CheckCircle } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
  );
}
