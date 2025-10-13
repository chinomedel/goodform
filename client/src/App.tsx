import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LandingPage } from "@/components/LandingPage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfigProvider } from "@/components/ConfigProvider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import FormsPage from "@/pages/FormsPage";
import DashboardPage from "@/pages/DashboardPage";
import FormBuilderPage from "@/pages/FormBuilderPage";
import FormResponsesPage from "@/pages/FormResponsesPage";
import PublicFormPage from "@/pages/PublicFormPage";
import PreviewFormPage from "@/pages/PreviewFormPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import LicensesPage from "@/pages/LicensesPage";
import AiConfigPage from "@/pages/AiConfigPage";
import SmtpConfigPage from "@/pages/SmtpConfigPage";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SetupPage from "@/pages/SetupPage";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-auth">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <div data-testid="loading-redirect"></div>;
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={user.roleId} />
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
              <Route path="/forms/:id/responses" component={FormResponsesPage} />
              <Route path="/preview/:id" component={PreviewFormPage} />
              <Route path="/users" component={UsersPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/licenses" component={LicensesPage} />
              <Route path="/ai-config" component={AiConfigPage} />
              <Route path="/smtp-config" component={SmtpConfigPage} />
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
      {/* Public routes */}
      <Route path="/setup" component={SetupPage} />
      <Route path="/public/:id" component={PublicFormPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={AuthenticatedApp} />
      <ProtectedRoute path="/forms" component={AuthenticatedApp} />
      <ProtectedRoute path="/builder" component={AuthenticatedApp} />
      <ProtectedRoute path="/builder/:id" component={AuthenticatedApp} />
      <ProtectedRoute path="/responses/:id" component={AuthenticatedApp} />
      <ProtectedRoute path="/forms/:id/responses" component={AuthenticatedApp} />
      <ProtectedRoute path="/preview/:id" component={AuthenticatedApp} />
      <ProtectedRoute path="/users" component={AuthenticatedApp} />
      <ProtectedRoute path="/settings" component={AuthenticatedApp} />
      <ProtectedRoute path="/licenses" component={AuthenticatedApp} />
      <ProtectedRoute path="/ai-config" component={AuthenticatedApp} />
      <ProtectedRoute path="/smtp-config" component={AuthenticatedApp} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
