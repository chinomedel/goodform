import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Users, BarChart3, Lock, Globe, Share2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppConfig } from "@shared/schema";

export function LandingPage() {
  const [, setLocation] = useLocation();
  
  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
  });

  const appName = config?.appName || "GoodForm";
  const logoUrl = config?.logoUrl;

  const getAppInitials = () => {
    const words = appName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return appName.substring(0, 2).toUpperCase();
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${appName} logo`}
                className="w-8 h-8 object-contain"
                data-testid="img-landing-logo"
              />
            ) : (
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-semibold text-xs">
                {getAppInitials()}
              </div>
            )}
            <span className="font-semibold text-lg" data-testid="text-landing-app-name">{appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              data-testid="button-login"
              onClick={() => setLocation('/auth')}
            >
              Iniciar Sesión
            </Button>
            <Button
              data-testid="button-signup"
              onClick={() => setLocation('/auth')}
            >
              Comenzar Gratis
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Crea y gestiona formularios profesionales
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Colabora en tiempo real, analiza respuestas con dashboards interactivos
            y exporta datos a Excel. Todo en una plataforma intuitiva.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              data-testid="button-get-started"
              onClick={() => setLocation('/auth')}
            >
              Comenzar Ahora
            </Button>
            <Button variant="outline" size="lg" data-testid="button-learn-more">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">
            Características Principales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Editor Intuitivo</h3>
              <p className="text-muted-foreground">
                Crea formularios con un editor drag-and-drop fácil de usar
              </p>
            </Card>

            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Colaboración</h3>
              <p className="text-muted-foreground">
                Comparte vistas previas y asigna permisos por formulario
              </p>
            </Card>

            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Analytics Avanzados</h3>
              <p className="text-muted-foreground">
                Visualiza respuestas con gráficos y exporta a Excel
              </p>
            </Card>

            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Control de Acceso</h3>
              <p className="text-muted-foreground">
                Gestiona roles: Admin, Gestor y Visualizador
              </p>
            </Card>

            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Formularios Públicos</h3>
              <p className="text-muted-foreground">
                Comparte con usuarios registrados o con cualquier persona
              </p>
            </Card>

            <Card className="p-6">
              <div className="bg-primary/10 p-3 rounded-md w-fit mb-4">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Vista Previa</h3>
              <p className="text-muted-foreground">
                Previsualiza y comparte formularios antes de publicar
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-6">
            Listo para comenzar?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Únete a miles de equipos que ya utilizan {appName}
          </p>
          <Button
            size="lg"
            data-testid="button-cta-start"
            onClick={() => setLocation('/auth')}
          >
            Crear Cuenta Gratis
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 {appName}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
