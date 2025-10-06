import { AppSidebar } from "../AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole="admin" />
        <div className="flex-1 p-8">
          <h2 className="text-2xl font-semibold">Contenido Principal</h2>
          <p className="text-muted-foreground mt-2">
            Este es el área de contenido principal de la aplicación.
          </p>
        </div>
      </div>
    </SidebarProvider>
  );
}
