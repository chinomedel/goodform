import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface PreviewForm {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  builderMode: 'visual' | 'code';
  customHtml?: string;
  customCss?: string;
  customJs?: string;
  status: string;
}

export default function PreviewFormPage() {
  const { id } = useParams();

  const { data: form, isLoading, error } = useQuery<PreviewForm>({
    queryKey: ['/api/forms', id, 'preview'],
    enabled: !!id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-preview">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se pudo cargar la vista previa del formulario
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-2xl">
        {form.status === 'draft' && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vista previa - Este formulario está en borrador y no es público aún
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-preview-title">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base">{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {form.builderMode === 'code' ? (
              <div className="custom-form-container">
                <div dangerouslySetInnerHTML={{ __html: form.customHtml || '' }} />
                <style>{form.customCss}</style>
                {form.customJs && (
                  <script dangerouslySetInnerHTML={{ __html: form.customJs }} />
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {form.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id} data-testid={`label-field-${field.id}`}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={field.id}
                        type="text"
                        placeholder={field.placeholder}
                        disabled
                        data-testid={`input-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === 'email' && (
                      <Input
                        id={field.id}
                        type="email"
                        placeholder={field.placeholder}
                        disabled
                        data-testid={`input-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.id}
                        type="number"
                        placeholder={field.placeholder}
                        disabled
                        data-testid={`input-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === 'date' && (
                      <Input
                        id={field.id}
                        type="date"
                        disabled
                        data-testid={`input-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.id}
                        placeholder={field.placeholder}
                        disabled
                        data-testid={`textarea-field-${field.id}`}
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <Select disabled>
                        <SelectTrigger id={field.id} data-testid={`select-field-${field.id}`}>
                          <SelectValue placeholder={field.placeholder || "Selecciona una opción"} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          disabled
                          data-testid={`checkbox-field-${field.id}`}
                        />
                        <Label htmlFor={field.id} className="font-normal cursor-not-allowed">
                          {field.placeholder || field.label}
                        </Label>
                      </div>
                    )}
                  </div>
                ))}
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Esta es una vista previa. Los campos están deshabilitados.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
