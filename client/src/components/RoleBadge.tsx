import { Badge } from "@/components/ui/badge";
import { Shield, Eye, PenTool, User, Crown } from "lucide-react";

interface RoleBadgeProps {
  role: string;
}

const roleConfig: Record<string, { label: string; className: string; icon: any }> = {
  admin_auto_host: {
    label: "Admin Auto-Host",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Shield,
  },
  super_admin: {
    label: "Super Admin",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Crown,
  },
  visualizador_auto_host: {
    label: "Visualizador Auto-Host",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: Eye,
  },
  cliente_saas: {
    label: "Cliente SaaS",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: User,
  },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || {
    label: role,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: User,
  };
  const Icon = config.icon;

  return (
    <Badge className={config.className} data-testid={`badge-role-${role}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
