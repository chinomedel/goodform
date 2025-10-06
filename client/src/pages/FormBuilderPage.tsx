import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBuilderField } from "@/components/FormBuilderField";
import { Card } from "@/components/ui/card";
import { Save, Eye, Globe, Loader2, Code2, Palette } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getForm, updateForm, updateFormFields, publishForm } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import type { FormField } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type FieldType = "text" | "email" | "number" | "select" | "checkbox" | "date" | "textarea";

interface LocalField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

export default function FormBuilderPage() {
  const params = useParams<{ id?: string }>();
  const formId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formTitle, setFormTitle] = useState("Nuevo Formulario");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<LocalField[]>([]);
  const [nextFieldId, setNextFieldId] = useState(1);
  
  const [builderMode, setBuilderMode] = useState<'visual' | 'code'>('visual');
  const [customHtml, setCustomHtml] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [customJs, setCustomJs] = useState("");
  
  const titleDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const descriptionDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: formData, isLoading } = useQuery({
    queryKey: ["/api/forms", formId],
    queryFn: () => getForm(formId!),
    enabled: !!formId,
  });

  useEffect(() => {
    if (formData) {
      setFormTitle(formData.title);
      setFormDescription(formData.description || "");
      setBuilderMode(formData.builderMode || 'visual');
      setCustomHtml(formData.customHtml || "");
      setCustomCss(formData.customCss || "");
      setCustomJs(formData.customJs || "");
      setFields(
        formData.fields
          .sort((a, b) => a.order - b.order)
          .map((f) => ({
            id: f.id,
            type: f.type as FieldType,
            label: f.label,
            required: f.required,
            placeholder: f.placeholder || undefined,
            options: f.options || undefined,
            order: f.order,
          }))
      );
      if (formData.fields.length > 0) {
        const maxOrder = Math.max(...formData.fields.map(f => f.order));
        setNextFieldId(maxOrder + 1);
      }
    }
  }, [formData]);

  const updateFormMutation = useMutation({
    mutationFn: (data: { 
      title?: string; 
      description?: string; 
      builderMode?: 'visual' | 'code';
      customHtml?: string;
      customCss?: string;
      customJs?: string;
    }) =>
      updateForm(formId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", formId] });
      toast({
        title: "Guardado",
        description: "Los cambios han sido guardados exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFieldsMutation = useMutation({
    mutationFn: (fieldsData: Partial<FormField>[]) =>
      updateFormFields(formId!, fieldsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", formId] });
      toast({
        title: "Guardado",
        description: "Los cambios han sido guardados exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishFormMutation = useMutation({
    mutationFn: () => publishForm(formId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", formId] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Formulario publicado",
        description: "El formulario ha sido publicado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al publicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const debouncedUpdateTitle = useCallback(
    (newTitle: string) => {
      if (!formId) return;
      
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }

      titleDebounceTimer.current = setTimeout(() => {
        updateFormMutation.mutate({ title: newTitle });
      }, 1000);
    },
    [formId, updateFormMutation]
  );

  const debouncedUpdateDescription = useCallback(
    (newDescription: string) => {
      if (!formId) return;
      
      if (descriptionDebounceTimer.current) {
        clearTimeout(descriptionDebounceTimer.current);
      }

      descriptionDebounceTimer.current = setTimeout(() => {
        updateFormMutation.mutate({ description: newDescription });
      }, 1000);
    },
    [formId, updateFormMutation]
  );

  const handleTitleChange = (newTitle: string) => {
    setFormTitle(newTitle);
    debouncedUpdateTitle(newTitle);
  };

  const handleDescriptionChange = (newDescription: string) => {
    setFormDescription(newDescription);
    debouncedUpdateDescription(newDescription);
  };

  const addField = (type: FieldType) => {
    if (!formId) {
      toast({
        title: "Guarda el formulario primero",
        description: "Debes guardar el formulario antes de agregar campos",
        variant: "destructive",
      });
      return;
    }

    const newField: LocalField = {
      id: `temp-${nextFieldId}`,
      type,
      label: `Nuevo campo ${type}`,
      required: false,
      placeholder: "",
      order: nextFieldId,
    };

    setFields([...fields, newField]);
    setNextFieldId(nextFieldId + 1);
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleSave = () => {
    if (!formId) {
      toast({
        title: "Error",
        description: "No se puede guardar un formulario sin ID",
        variant: "destructive",
      });
      return;
    }

    if (builderMode === 'code') {
      // Guardar código personalizado
      updateFormMutation.mutate({
        builderMode: 'code',
        customHtml,
        customCss,
        customJs,
      });
    } else {
      // Guardar campos visuales
      const fieldsData = fields.map((field, index) => ({
        formId: formId,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || null,
        required: field.required,
        options: field.options || null,
        order: index,
      }));

      updateFormMutation.mutate({ builderMode: 'visual' });
      updateFieldsMutation.mutate(fieldsData);
    }
  };

  const handlePreview = () => {
    if (formId) {
      window.open(`/public/${formId}`, "_blank");
    }
  };

  const handlePublish = () => {
    if (!formId) {
      toast({
        title: "Error",
        description: "No se puede publicar un formulario sin ID",
        variant: "destructive",
      });
      return;
    }

    publishFormMutation.mutate();
  };

  const fieldTypes: Array<{ type: FieldType; label: string; icon: string }> = [
    { type: "text", label: "Texto", icon: "T" },
    { type: "email", label: "Email", icon: "@" },
    { type: "number", label: "Número", icon: "#" },
    { type: "select", label: "Selección", icon: "▼" },
    { type: "checkbox", label: "Checkbox", icon: "☐" },
    { type: "date", label: "Fecha", icon: "📅" },
    { type: "textarea", label: "Área de texto", icon: "≡" },
  ];

  if (formId && isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <header className="border-b border-border bg-background px-8 py-4 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border bg-background px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <Input
            value={formTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
            data-testid="input-form-title"
          />
          <div className="flex items-center gap-2 border border-border rounded-md p-1">
            <Button
              variant={builderMode === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setBuilderMode('visual')}
              data-testid="button-mode-visual"
            >
              <Palette className="h-4 w-4 mr-2" />
              Visual
            </Button>
            <Button
              variant={builderMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setBuilderMode('code')}
              data-testid="button-mode-code"
            >
              <Code2 className="h-4 w-4 mr-2" />
              Código
            </Button>
          </div>
          {builderMode === 'code' && (
            <Badge variant="outline">Modo Código Personalizado</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!formId}
            data-testid="button-preview"
          >
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!formId || updateFieldsMutation.isPending}
            data-testid="button-save"
          >
            {updateFieldsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!formId || publishFormMutation.isPending}
            data-testid="button-publish"
          >
            {publishFormMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publicar
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {builderMode === 'visual' ? (
          <>
            <aside className="w-64 border-r border-border bg-muted/30 p-4 overflow-y-auto">
              <h3 className="font-semibold mb-3">Campos Disponibles</h3>
              <div className="space-y-2">
                {fieldTypes.map((field) => (
                  <Card
                    key={field.type}
                    className="p-3 cursor-pointer hover-elevate"
                    onClick={() => addField(field.type)}
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
                    onChange={(e) => handleDescriptionChange(e.target.value)}
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
                  id={field.id}
                  type={field.type}
                  label={field.label}
                  required={field.required}
                  placeholder={field.placeholder}
                  onDelete={() => deleteField(field.id)}
                  onSettings={() => console.log("Settings", field.id)}
                />
              ))}
            </div>

            {fields.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Haz clic en los campos del panel izquierdo para comenzar</p>
              </div>
            )}
          </div>
        </main>

        <aside className="w-80 border-l border-border bg-muted/30 p-4 overflow-y-auto">
          <Tabs defaultValue="settings">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1" data-testid="tab-settings">
                Configuración
              </TabsTrigger>
              <TabsTrigger value="sharing" className="flex-1" data-testid="tab-sharing">
                Compartir
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold">Estado</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-form-status">
                  {formData?.status === "published"
                    ? "Este formulario está publicado"
                    : "Este formulario está en borrador"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Respuestas</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-response-count">
                  {formData ? `${formData.fields.length} campos` : "0 campos"}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="sharing" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold">Visibilidad</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-share-type">
                  {formData?.shareType === "public"
                    ? "Este formulario es público"
                    : "Solo usuarios con permisos pueden ver este formulario"}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
          </>
        ) : (
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label>Descripción del formulario</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Descripción opcional del formulario"
                      className="mt-2"
                      data-testid="input-form-description-code"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <Tabs defaultValue="html" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="html" className="flex-1" data-testid="tab-html">
                      HTML
                    </TabsTrigger>
                    <TabsTrigger value="css" className="flex-1" data-testid="tab-css">
                      CSS
                    </TabsTrigger>
                    <TabsTrigger value="js" className="flex-1" data-testid="tab-js">
                      JavaScript
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex-1" data-testid="tab-preview">
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="html" className="mt-4">
                    <Label className="mb-2 block">HTML del Formulario</Label>
                    <Textarea
                      value={customHtml}
                      onChange={(e) => setCustomHtml(e.target.value)}
                      placeholder="<form>&#10;  <input type='text' name='campo1' />&#10;  <button>Enviar</button>&#10;</form>"
                      className="font-mono text-sm min-h-[400px]"
                      data-testid="textarea-custom-html"
                    />
                  </TabsContent>

                  <TabsContent value="css" className="mt-4">
                    <Label className="mb-2 block">CSS del Formulario</Label>
                    <Textarea
                      value={customCss}
                      onChange={(e) => setCustomCss(e.target.value)}
                      placeholder="form {&#10;  max-width: 600px;&#10;  margin: 0 auto;&#10;}"
                      className="font-mono text-sm min-h-[400px]"
                      data-testid="textarea-custom-css"
                    />
                  </TabsContent>

                  <TabsContent value="js" className="mt-4">
                    <Label className="mb-2 block">JavaScript del Formulario</Label>
                    <Textarea
                      value={customJs}
                      onChange={(e) => setCustomJs(e.target.value)}
                      placeholder="// Código JavaScript para validación o funcionalidad adicional"
                      className="font-mono text-sm min-h-[400px]"
                      data-testid="textarea-custom-js"
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <Label className="mb-2 block">Vista Previa</Label>
                    <Card className="p-6 bg-muted/30">
                      <div
                        dangerouslySetInnerHTML={{ __html: customHtml }}
                      />
                      <style>{customCss}</style>
                    </Card>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
