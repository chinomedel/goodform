import { Badge } from "@/components/ui/badge";
import { Shield, Eye, PenTool, User } from "lucide-react";

type UserRole = "admin" | "gestor" | "visualizador" | "cliente";

interface RoleBadgeProps {
  role: UserRole;
}

const roleConfig = {
  admin: {
    label: "Admin",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Shield,
  },
  gestor: {
    label: "Gestor",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: PenTool,
  },
  visualizador: {
    label: "Visualizador",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: Eye,
  },
  cliente: {
    label: "Cliente",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: User,
  },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge className={config.className} data-testid={`badge-role-${role}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
