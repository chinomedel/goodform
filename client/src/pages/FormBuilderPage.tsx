import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBuilderField } from "@/components/FormBuilderField";
import { Card } from "@/components/ui/card";
import { Save, Eye, Globe } from "lucide-react";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function FormBuilderPage() {
  const [formTitle, setFormTitle] = useState("Nuevo Formulario");
  const [formDescription, setFormDescription] = useState("");
  
  const fields = [
    { id: "1", type: "text" as const, label: "Nombre completo", required: true, placeholder: "Ingresa tu nombre" },
    { id: "2", type: "email" as const, label: "Correo electrónico", required: true, placeholder: "ejemplo@correo.com" },
    { id: "3", type: "select" as const, label: "Departamento", required: false, placeholder: "Selecciona una opción" },
    { id: "4", type: "textarea" as const, label: "Comentarios", required: false, placeholder: "Escribe tus comentarios" },
  ];

  const fieldTypes = [
    { type: "text", label: "Texto", icon: "T" },
    { type: "email", label: "Email", icon: "@" },
    { type: "number", label: "Número", icon: "#" },
    { type: "select", label: "Selección", icon: "▼" },
    { type: "checkbox", label: "Checkbox", icon: "☐" },
    { type: "date", label: "Fecha", icon: "📅" },
    { type: "textarea", label: "Área de texto", icon: "≡" },
  ];

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border bg-background px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <Input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
            data-testid="input-form-title"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-preview">
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button variant="outline" data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button data-testid="button-publish">
            <Globe className="h-4 w-4 mr-2" />
            Publicar
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <aside className="w-64 border-r border-border bg-muted/30 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Campos Disponibles</h3>
          <div className="space-y-2">
            {fieldTypes.map((field) => (
              <Card
                key={field.type}
                className="p-3 cursor-pointer hover-elevate"
                onClick={() => console.log("Add field:", field.type)}
                data-testid={`button-add-${field.type}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{field.icon}</span>
                  <span className="text-sm font-medium">{field.label}</span>
                </div>
              </Card>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-8">
            <Card className="p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <Label>Descripción del formulario</Label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descripción opcional del formulario"
                    className="mt-2"
                    data-testid="input-form-description"
                  />
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              {fields.map((field) => (
                <FormBuilderField
                  key={field.id}
                  {...field}
                  onDelete={() => console.log("Delete", field.id)}
                  onSettings={() => console.log("Settings", field.id)}
                />
              ))}
            </div>

            {fields.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Arrastra campos desde el panel izquierdo para comenzar</p>
              </div>
            )}
          </div>
        </main>

        <aside className="w-80 border-l border-border bg-muted/30 p-4 overflow-y-auto">
          <Tabs defaultValue="settings">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">Configuración</TabsTrigger>
              <TabsTrigger value="sharing" className="flex-1">Compartir</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold">Estado</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Este formulario está en borrador
                </p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Respuestas</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  0 respuestas recibidas
                </p>
              </div>
            </TabsContent>
            <TabsContent value="sharing" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold">Visibilidad</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Configura quién puede ver este formulario
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
