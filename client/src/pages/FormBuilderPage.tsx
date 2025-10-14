import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBuilderField } from "@/components/FormBuilderField";
import { Card } from "@/components/ui/card";
import { Save, Eye, Globe, Loader2, Code2, Palette, HelpCircle, Plus, X, Copy } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

function FieldOptionsEditor({ 
  field, 
  onSave, 
  onCancel 
}: { 
  field: LocalField | null; 
  onSave: (fieldId: string, options: string[]) => void; 
  onCancel: () => void; 
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    if (field?.options) {
      setOptions(field.options);
    } else {
      setOptions([]);
    }
  }, [field]);

  const addOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (field && options.length > 0) {
      onSave(field.id, options);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Opciones existentes</Label>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay opciones agregadas</p>
        ) : (
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={option} readOnly className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  data-testid={`button-remove-option-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Agregar nueva opción</Label>
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOption();
              }
            }}
            placeholder="Escribe una opción y presiona Enter"
            data-testid="input-new-option"
          />
          <Button onClick={addOption} size="icon" data-testid="button-add-option">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-options">
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={options.length === 0}
          data-testid="button-save-options"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
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
  
  const [submitButtonText, setSubmitButtonText] = useState("Enviar respuesta");
  const [submitButtonColor, setSubmitButtonColor] = useState("#6366f1");
  
  const [urlParams, setUrlParams] = useState<string[]>([]);
  const [newUrlParam, setNewUrlParam] = useState("");
  const [publishStartDate, setPublishStartDate] = useState<string>("");
  const [publishEndDate, setPublishEndDate] = useState<string>("");
  
  const titleDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const descriptionDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonTextDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const buttonColorDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<LocalField | null>(null);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);

  const { data: formData, isLoading } = useQuery({
    queryKey: ["/api/forms", formId],
    queryFn: () => getForm(formId!),
    enabled: !!formId,
  });

  // Helper to format Date to datetime-local string using local calendar components
  const toLocalDateTimeString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to convert datetime-local string to UTC Date
  const fromLocalDateTimeString = (dateTimeString: string): Date => {
    // datetime-local string is in format "YYYY-MM-DDTHH:mm"
    // We need to create a Date in the user's local timezone
    const [datePart, timePart] = dateTimeString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create date in local timezone
    return new Date(year, month - 1, day, hours, minutes);
  };

  useEffect(() => {
    if (formData) {
      setFormTitle(formData.title);
      setFormDescription(formData.description || "");
      setBuilderMode(formData.builderMode || 'visual');
      setCustomHtml(formData.customHtml || "");
      setCustomCss(formData.customCss || "");
      setCustomJs(formData.customJs || "");
      setSubmitButtonText(formData.submitButtonText || "Enviar respuesta");
      setSubmitButtonColor(formData.submitButtonColor || "#6366f1");
      setUrlParams(formData.urlParams ? (formData.urlParams as string[]) : []);
      
      // Format dates for datetime-local input (preserving local timezone)
      if (formData.publishStartDate) {
        const startDate = new Date(formData.publishStartDate);
        setPublishStartDate(toLocalDateTimeString(startDate));
      } else {
        setPublishStartDate("");
      }
      if (formData.publishEndDate) {
        const endDate = new Date(formData.publishEndDate);
        setPublishEndDate(toLocalDateTimeString(endDate));
      } else {
        setPublishEndDate("");
      }
      
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
      submitButtonText?: string;
      submitButtonColor?: string;
      urlParams?: string[];
      publishStartDate?: Date | null;
      publishEndDate?: Date | null;
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

  const handleButtonTextChange = (newText: string) => {
    setSubmitButtonText(newText);
    
    if (buttonTextDebounceTimer.current) {
      clearTimeout(buttonTextDebounceTimer.current);
    }
    
    buttonTextDebounceTimer.current = setTimeout(() => {
      if (formId) {
        updateFormMutation.mutate({ submitButtonText: newText });
      }
    }, 1000);
  };

  const handleButtonColorChange = (newColor: string) => {
    setSubmitButtonColor(newColor);
    
    if (buttonColorDebounceTimer.current) {
      clearTimeout(buttonColorDebounceTimer.current);
    }
    
    buttonColorDebounceTimer.current = setTimeout(() => {
      if (formId) {
        updateFormMutation.mutate({ submitButtonColor: newColor });
      }
    }, 1000);
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
      options: type === 'select' || type === 'checkbox' ? [] : undefined,
      order: nextFieldId,
    };

    setFields([...fields, newField]);
    setNextFieldId(nextFieldId + 1);
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const updateFieldLabel = (fieldId: string, newLabel: string) => {
    setFields(fields.map((f) => 
      f.id === fieldId ? { ...f, label: newLabel } : f
    ));
  };

  const handleDragStart = (fieldId: string) => {
    setDraggedFieldId(fieldId);
  };

  const handleDragOver = (targetFieldId: string) => {
    if (!draggedFieldId || draggedFieldId === targetFieldId) return;

    const draggedIndex = fields.findIndex(f => f.id === draggedFieldId);
    const targetIndex = fields.findIndex(f => f.id === targetFieldId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newFields = [...fields];
    const [draggedField] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, draggedField);

    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    setFields(reorderedFields);
  };

  const handleDragEnd = () => {
    setDraggedFieldId(null);
  };

  const openFieldSettings = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field && (field.type === 'select' || field.type === 'checkbox')) {
      setEditingField(field);
      setOptionsDialogOpen(true);
    }
  };

  const updateFieldOptions = (fieldId: string, options: string[]) => {
    setFields(fields.map((f) => 
      f.id === fieldId ? { ...f, options } : f
    ));
    setOptionsDialogOpen(false);
    setEditingField(null);
  };

  const addUrlParam = () => {
    if (newUrlParam.trim() && !urlParams.includes(newUrlParam.trim())) {
      const updatedParams = [...urlParams, newUrlParam.trim()];
      setUrlParams(updatedParams);
      setNewUrlParam("");
      
      if (formId) {
        updateFormMutation.mutate({ urlParams: updatedParams });
      }
    }
  };

  const removeUrlParam = (param: string) => {
    const updatedParams = urlParams.filter(p => p !== param);
    setUrlParams(updatedParams);
    
    if (formId) {
      updateFormMutation.mutate({ urlParams: updatedParams });
    }
  };

  const handleStartDateChange = (dateString: string) => {
    setPublishStartDate(dateString);
    
    if (formId) {
      const date = dateString ? fromLocalDateTimeString(dateString) : null;
      console.log('Publishing start date:', { dateString, date });
      updateFormMutation.mutate({ publishStartDate: date });
    }
  };

  const handleEndDateChange = (dateString: string) => {
    setPublishEndDate(dateString);
    
    if (formId) {
      const date = dateString ? fromLocalDateTimeString(dateString) : null;
      console.log('Publishing end date:', { dateString, date });
      updateFormMutation.mutate({ publishEndDate: date });
    }
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

    // Guardar fechas de publicación si están configuradas
    const startDate = publishStartDate ? fromLocalDateTimeString(publishStartDate) : null;
    const endDate = publishEndDate ? fromLocalDateTimeString(publishEndDate) : null;
    
    if (startDate || endDate) {
      updateFormMutation.mutate({ 
        publishStartDate: startDate, 
        publishEndDate: endDate 
      });
    }
  };

  const handlePreview = () => {
    if (formId) {
      window.open(`/preview/${formId}`, "_blank");
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
                  options={field.options}
                  onDelete={() => deleteField(field.id)}
                  onSettings={() => openFieldSettings(field.id)}
                  onLabelChange={(newLabel) => updateFieldLabel(field.id, newLabel)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                />
              ))}
              
              {fields.length > 0 && (
                <div className="pt-4">
                  <Button 
                    type="button" 
                    className="w-full" 
                    disabled
                    style={{ backgroundColor: submitButtonColor }}
                    data-testid="button-submit-preview"
                  >
                    {submitButtonText}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Este botón aparecerá en el formulario publicado
                  </p>
                </div>
              )}
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
              <div className="pt-2 border-t">
                <Label className="text-sm font-semibold">Botón de envío</Label>
                <div className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Texto del botón</Label>
                    <Input
                      value={submitButtonText}
                      onChange={(e) => handleButtonTextChange(e.target.value)}
                      placeholder="Enviar respuesta"
                      className="mt-1"
                      data-testid="input-button-text"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Color del botón</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={submitButtonColor}
                        onChange={(e) => handleButtonColorChange(e.target.value)}
                        className="w-14 h-9 p-1 cursor-pointer"
                        data-testid="input-button-color-picker"
                      />
                      <Input
                        type="text"
                        value={submitButtonColor}
                        onChange={(e) => handleButtonColorChange(e.target.value)}
                        placeholder="#6366f1"
                        className="flex-1"
                        data-testid="input-button-color-text"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <Label className="text-sm font-semibold">Parámetros de URL</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Define qué parámetros de la URL deseas capturar automáticamente con las respuestas
                </p>
                <div className="space-y-2">
                  {urlParams.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay parámetros configurados</p>
                  ) : (
                    <div className="space-y-1">
                      {urlParams.map((param, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                          <code className="text-xs flex-1">{param}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeUrlParam(param)}
                            data-testid={`button-remove-param-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newUrlParam}
                      onChange={(e) => setNewUrlParam(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addUrlParam();
                        }
                      }}
                      placeholder="ej: source, email, user_id"
                      className="flex-1"
                      data-testid="input-new-url-param"
                    />
                    <Button onClick={addUrlParam} size="icon" data-testid="button-add-url-param">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ejemplo de URL: /public/form-id?source=email&user_id=123
                  </p>
                </div>
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

              <div className="pt-2 border-t space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">URL Pública</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cualquier persona con este enlace puede completar el formulario
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/public/${formId}`}
                      readOnly
                      className="font-mono text-xs"
                      data-testid="input-public-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/public/${formId}`);
                        toast({
                          title: "Copiado",
                          description: "URL pública copiada al portapapeles",
                        });
                      }}
                      data-testid="button-copy-public-url"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">URL para Usuarios Registrados</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Solo usuarios que hayan iniciado sesión pueden acceder
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/preview/${formId}`}
                      readOnly
                      className="font-mono text-xs"
                      data-testid="input-auth-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/preview/${formId}`);
                        toast({
                          title: "Copiado",
                          description: "URL para usuarios registrados copiada al portapapeles",
                        });
                      }}
                      data-testid="button-copy-auth-url"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="text-sm font-semibold">Período de Publicación</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Define el rango de fechas durante el cual el formulario estará disponible públicamente
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="publish-start-date" className="text-xs">
                      Fecha de inicio (opcional)
                    </Label>
                    <Input
                      id="publish-start-date"
                      type="datetime-local"
                      value={publishStartDate}
                      onChange={(e) => {
                        console.log('START DATE CHANGED:', e.target.value);
                        handleStartDateChange(e.target.value);
                      }}
                      data-testid="input-publish-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publish-end-date" className="text-xs">
                      Fecha de fin (opcional)
                    </Label>
                    <Input
                      id="publish-end-date"
                      type="datetime-local"
                      value={publishEndDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      data-testid="input-publish-end-date"
                    />
                  </div>
                  {publishStartDate && publishEndDate && (
                    <p className="text-xs text-muted-foreground">
                      El formulario estará disponible desde{" "}
                      <span className="font-medium">
                        {new Date(publishStartDate).toLocaleDateString("es-ES", {
                          dateStyle: "short",
                        })}
                      </span>{" "}
                      hasta{" "}
                      <span className="font-medium">
                        {new Date(publishEndDate).toLocaleDateString("es-ES", {
                          dateStyle: "short",
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Dialog para editar opciones de select/checkbox */}
        <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar opciones</DialogTitle>
              <DialogDescription>
                Agrega las opciones para el campo "{editingField?.label}"
              </DialogDescription>
            </DialogHeader>
            <FieldOptionsEditor
              field={editingField}
              onSave={updateFieldOptions}
              onCancel={() => {
                setOptionsDialogOpen(false);
                setEditingField(null);
              }}
            />
          </DialogContent>
        </Dialog>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Editor de Código Personalizado</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-show-instructions">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Ver Instrucciones
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Instrucciones para Formularios Personalizados</DialogTitle>
                        <DialogDescription>
                          Aprende cómo mapear los campos de tu formulario HTML para que funcionen correctamente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">1. Estructura Básica del Formulario</h4>
                          <p className="text-muted-foreground mb-2">
                            Tu formulario HTML debe incluir un elemento <code className="bg-muted px-1 py-0.5 rounded">{'<form>'}</code> con campos de entrada.
                          </p>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                            <pre>{`<form id="customForm">
  <input type="text" name="nombre" required />
  <input type="email" name="email" required />
  <button type="submit">Enviar</button>
</form>`}</pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">2. Atributo "name" en los Campos</h4>
                          <p className="text-muted-foreground mb-2">
                            Cada campo debe tener un atributo <code className="bg-muted px-1 py-0.5 rounded">name</code> único. 
                            Este será el identificador del campo cuando se envíe el formulario.
                          </p>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                            <pre>{`<input type="text" name="campo1" placeholder="Nombre completo" />
<input type="email" name="campo2" placeholder="Email" />
<textarea name="campo3" placeholder="Mensaje"></textarea>
<select name="campo4">
  <option value="opcion1">Opción 1</option>
  <option value="opcion2">Opción 2</option>
</select>`}</pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">3. Tipos de Campos Soportados</h4>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="text">'}</code> - Texto simple</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="email">'}</code> - Email</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="number">'}</code> - Número</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="date">'}</code> - Fecha</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="tel">'}</code> - Teléfono</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<textarea>'}</code> - Texto largo</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<select>'}</code> - Selección</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="checkbox">'}</code> - Casillas de verificación</li>
                            <li><code className="bg-muted px-1 py-0.5 rounded">{'<input type="radio">'}</code> - Opciones de radio</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">4. Ejemplo Completo con CSS</h4>
                          <p className="text-muted-foreground mb-2">
                            Combina HTML y CSS para crear formularios con diseño personalizado:
                          </p>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold">HTML:</p>
                            <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                              <pre>{`<form id="contactForm" class="custom-form">
  <div class="form-group">
    <label for="nombre">Nombre Completo</label>
    <input type="text" id="nombre" name="nombre" required />
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required />
  </div>
  <div class="form-group">
    <label for="mensaje">Mensaje</label>
    <textarea id="mensaje" name="mensaje" rows="4"></textarea>
  </div>
  <button type="submit" class="submit-btn">Enviar</button>
</form>`}</pre>
                            </div>
                            <p className="text-xs font-semibold mt-3">CSS:</p>
                            <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                              <pre>{`.custom-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.submit-btn {
  background-color: #0070f3;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.submit-btn:hover {
  background-color: #0051cc;
}`}</pre>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">5. Enviar el Formulario (IMPORTANTE)</h4>
                          <p className="text-muted-foreground mb-2">
                            Para que tu formulario se envíe correctamente y muestre el mensaje de éxito, 
                            debes usar la función <code className="bg-muted px-1 py-0.5 rounded">submitCustomForm()</code> en tu JavaScript:
                          </p>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                            <pre>{`// Capturar el evento submit del formulario
document.getElementById('customForm')?.addEventListener('submit', async function(e) {
  e.preventDefault(); // Prevenir envío por defecto
  
  // Obtener los datos del formulario
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  // Enviar usando la función global
  const result = await submitCustomForm(data);
  
  if (result.success) {
    console.log('Formulario enviado exitosamente!');
    // Se mostrará automáticamente el mensaje de éxito
  }
});`}</pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">6. Ejemplo Completo con Validación y Envío</h4>
                          <p className="text-muted-foreground mb-2">
                            Combina validación personalizada con el envío correcto:
                          </p>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                            <pre>{`document.getElementById('customForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Validación personalizada
  const email = document.querySelector('[name="email"]').value;
  if (!email.includes('@')) {
    alert('Por favor ingresa un email válido');
    return;
  }
  
  // Obtener datos del formulario
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  // Enviar el formulario
  const result = await submitCustomForm(data);
  
  if (result.success) {
    console.log('¡Enviado con éxito!');
  } else {
    console.error('Error al enviar:', result.error);
  }
});`}</pre>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                          <p className="text-sm">
                            <strong>💡 Nota Importante:</strong> Los formularios personalizados se mostrarán exactamente como los diseñes. 
                            Asegúrate de usar <code className="bg-muted px-1 py-0.5 rounded text-xs">submitCustomForm()</code> en tu JavaScript 
                            para enviar los datos correctamente y probar tu formulario usando la pestaña "Preview" antes de publicarlo.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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
