import { FormCard } from "@/components/FormCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ShareFormDialog } from "@/components/ShareFormDialog";

export default function FormsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  const forms = [
    {
      id: "1",
      title: "Encuesta de Satisfacción del Cliente",
      description: "Evalúa la experiencia del cliente con nuestros servicios",
      status: "published" as const,
      responses: 142,
      lastModified: "Hace 2 horas",
      isPublic: true,
    },
    {
      id: "2",
      title: "Registro de Eventos 2024",
      description: "Formulario de inscripción para eventos corporativos",
      status: "draft" as const,
      responses: 0,
      lastModified: "Hace 1 día",
      isPublic: false,
    },
    {
      id: "3",
      title: "Feedback de Productos",
      description: "Recopila opiniones sobre nuestros productos",
      status: "published" as const,
      responses: 87,
      lastModified: "Hace 3 días",
      isPublic: false,
    },
    {
      id: "4",
      title: "Solicitud de Vacaciones",
      description: "Formulario interno para solicitar días libres",
      status: "published" as const,
      responses: 45,
      lastModified: "Hace 1 semana",
      isPublic: false,
    },
  ];

  const handleShare = (form: any) => {
    setSelectedForm(form);
    setShareDialogOpen(true);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Mis Formularios</h1>
            <p className="text-muted-foreground">
              Gestiona y analiza todos tus formularios
            </p>
          </div>
          <Button data-testid="button-create-form">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Formulario
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar formularios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-forms"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              {...form}
              onEdit={() => console.log("Edit", form.id)}
              onPreview={() => console.log("Preview", form.id)}
              onShare={() => handleShare(form)}
              onDelete={() => console.log("Delete", form.id)}
              onAnalyze={() => console.log("Analyze", form.id)}
            />
          ))}
        </div>
      </div>

      {selectedForm && (
        <ShareFormDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          formTitle={selectedForm.title}
          formUrl={`https://goodform.app/f/${selectedForm.id}`}
        />
      )}
    </div>
  );
}
