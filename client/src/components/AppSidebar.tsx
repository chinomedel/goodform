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
import { FileText, BarChart3, LogOut, Plus, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "./RoleBadge";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Formularios", url: "/forms", icon: FileText },
];

interface AppSidebarProps {
  userRole?: "admin" | "gestor" | "visualizador";
}

export function AppSidebar({ userRole = "gestor" }: AppSidebarProps) {
  const [location] = useLocation();
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: getCurrentUser,
  });

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
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-semibold">
            GF
          </div>
          <span className="font-semibold text-lg">GoodForm</span>
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
              <RoleBadge role={user?.role || userRole} />
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          data-testid="button-logout"
          onClick={() => window.location.href = '/api/logout'}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
