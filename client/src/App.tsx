import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LandingPage } from "@/components/LandingPage";
import { ThemeToggle } from "@/components/ThemeToggle";
import FormsPage from "@/pages/FormsPage";
import DashboardPage from "@/pages/DashboardPage";
import FormBuilderPage from "@/pages/FormBuilderPage";
import FormResponsesPage from "@/pages/FormResponsesPage";
import PublicFormPage from "@/pages/PublicFormPage";
import NotFound from "@/pages/not-found";
import { getCurrentUser } from "@/lib/api";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: getCurrentUser,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-auth">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/public/:id" component={PublicFormPage} />
        <Route component={() => <Redirect to="/" />} />
      </Switch>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={user.role} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-2 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/forms" component={FormsPage} />
              <Route path="/builder" component={FormBuilderPage} />
              <Route path="/builder/:id" component={FormBuilderPage} />
              <Route path="/responses/:id" component={FormResponsesPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/public/:id" component={PublicFormPage} />
      <Route>
        <AuthenticatedApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
