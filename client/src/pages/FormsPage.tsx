import { FormCard } from "@/components/FormCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { ShareFormDialog } from "@/components/ShareFormDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getForms, createForm, deleteForm } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function FormsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: forms, isLoading } = useQuery({
    queryKey: ["/api/forms"],
    queryFn: getForms,
  });

  const createFormMutation = useMutation({
    mutationFn: createForm,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Formulario creado",
        description: "El nuevo formulario ha sido creado exitosamente",
      });
      setLocation(`/builder/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: deleteForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado exitosamente",
      });
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredForms = useMemo(() => {
    if (!forms) return [];
    if (!searchQuery.trim()) return forms;

    const query = searchQuery.toLowerCase();
    return forms.filter(
      (form) =>
        form.title.toLowerCase().includes(query) ||
        form.description?.toLowerCase().includes(query)
    );
  }, [forms, searchQuery]);

  const handleCreateForm = () => {
    createFormMutation.mutate({
      title: "Nuevo Formulario",
      description: "",
    });
  };

  const handleShare = (form: any) => {
    setSelectedForm(form);
    setShareDialogOpen(true);
  };

  const handleEdit = (formId: string) => {
    setLocation(`/builder/${formId}`);
  };

  const handlePreview = (formId: string) => {
    window.open(`/public/${formId}`, "_blank");
  };

  const handleAnalyze = (formId: string) => {
    setLocation(`/responses/${formId}`);
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (formToDelete) {
      deleteFormMutation.mutate(formToDelete);
    }
  };

  const formatLastModified = (date: Date | string | null | undefined) => {
    if (!date) return "Nunca";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
    } catch {
      return "Fecha inválida";
    }
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
          <Button
            data-testid="button-create-form"
            onClick={handleCreateForm}
            disabled={createFormMutation.isPending}
          >
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No se encontraron formularios que coincidan con tu búsqueda"
                : "No tienes formularios aún. Crea uno para comenzar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredForms.map((form) => (
              <FormCard
                key={form.id}
                id={form.id}
                title={form.title}
                description={form.description || ""}
                status={form.status}
                responses={form.responseCount}
                lastModified={formatLastModified(form.updatedAt)}
                isPublic={form.shareType === "public"}
                onEdit={() => handleEdit(form.id)}
                onPreview={() => handlePreview(form.id)}
                onShare={() => handleShare(form)}
                onDelete={() => handleDeleteClick(form.id)}
                onAnalyze={() => handleAnalyze(form.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedForm && (
        <ShareFormDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          formTitle={selectedForm.title}
          formUrl={`${window.location.origin}/public/${selectedForm.id}`}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              formulario y todas sus respuestas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteFormMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
