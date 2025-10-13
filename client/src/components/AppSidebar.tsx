import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { FileText, LogOut, Plus, LayoutDashboard, Users, Settings, Key, Brain, Mail, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "./RoleBadge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AppConfig } from "@shared/schema";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Formularios", url: "/forms", icon: FileText },
];

const adminMenuItems = [
  { title: "Usuarios", url: "/users", icon: Users },
  { title: "Diseño Aplicación", url: "/design-settings", icon: Settings },
  { title: "Configuración IA", url: "/ai-config", icon: Brain },
  { title: "Configuración SMTP", url: "/smtp-config", icon: Mail },
];

const reportsMenuItems = [
  { title: "Uso Aplicación", url: "/reports/usage", icon: BarChart3 },
];

const superAdminMenuItems = [
  { title: "Licencias", url: "/licenses", icon: Key },
];

interface AppSidebarProps {
  userRole?: string;
}

export function AppSidebar({ userRole = "cliente_saas" }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  const appName = config?.appName || "GoodForm";
  const logoUrl = config?.logoUrl;

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.firstName?.[0] || '';
    const lastName = user.lastName?.[0] || '';
    return `${firstName}${lastName}`.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Usuario';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Usuario';
  };

  const getAppInitials = () => {
    const words = appName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return appName.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={`${appName} logo`}
              className="w-8 h-8 object-contain"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <div className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-semibold text-xs">
              {getAppInitials()}
            </div>
          )}
          <span className="font-semibold text-lg" data-testid="text-app-name">{appName}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 py-2">
            <Link href="/builder">
              <Button className="w-full" data-testid="button-new-form">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Formulario
              </Button>
            </Link>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.roleId === "admin_auto_host" || user?.roleId === "super_admin" || user?.isSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(user?.roleId === "admin_auto_host" || user?.roleId === "super_admin" || user?.isSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Reportes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reportsMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user?.isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || ''} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
            <div className="mt-1">
              <RoleBadge role={user?.roleId || userRole} />
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          data-testid="button-logout"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? "Cerrando..." : "Cerrar Sesión"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
