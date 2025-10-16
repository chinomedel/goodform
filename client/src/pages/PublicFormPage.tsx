import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPublicForm, submitPublicForm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConditionalLogic {
  enabled: boolean;
  logicType: "and" | "or";
  conditions: Array<{
    fieldId: string;
    operator: "equals" | "not_equals" | "contains";
    value: string;
  }>;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  conditionalLogic?: ConditionalLogic | null;
}

export default function PublicFormPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [urlParams, setUrlParams] = useState<Record<string, string>>({});
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [processedCss, setProcessedCss] = useState<string>('');
  const headElementsRef = useRef<HTMLElement[]>([]);
  const scriptElementRef = useRef<HTMLScriptElement | null>(null);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['/api/public/forms', id],
    queryFn: () => getPublicForm(id!),
    enabled: !!id,
    retry: false,
  });

  // Capture URL parameters
  useEffect(() => {
    if (form?.urlParams && form.urlParams.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const capturedParams: Record<string, string> = {};
      
      form.urlParams.forEach((param: string) => {
        const value = searchParams.get(param);
        if (value) {
          capturedParams[param] = value;
        }
      });
      
      setUrlParams(capturedParams);
    }
  }, [form]);

  // Extract and inject <link> tags and @import styles into <head> for proper loading
  useEffect(() => {
    if (form?.builderMode === 'code') {
      // Clean up previous head elements
      headElementsRef.current.forEach(el => el.remove());
      headElementsRef.current = [];
      
      // Clean up previous script
      if (scriptElementRef.current) {
        scriptElementRef.current.remove();
        scriptElementRef.current = null;
      }

      // Process HTML if exists
      if (form.customHtml) {
        // Unescape double-encoded quotes that may come from database
        const cleanHtml = form.customHtml.replace(/""/g, '"');
        console.log('📄 HTML (primeras líneas):', cleanHtml.substring(0, 500));
        
        // Use DOMParser to parse the full HTML document structure
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanHtml, 'text/html');

        // Extract all <link> tags from the parsed document (including from <head>)
        const linkTags = doc.querySelectorAll('link');
        console.log('🔗 Links encontrados en HTML:', linkTags.length);
        linkTags.forEach(link => {
          const newLink = document.createElement('link');
          Array.from(link.attributes).forEach(attr => {
            newLink.setAttribute(attr.name, attr.value);
          });
          console.log('✅ Link agregado al head:', newLink.href || newLink.getAttribute('href'));
          document.head.appendChild(newLink);
          headElementsRef.current.push(newLink);
          link.remove(); // Remove from the HTML to avoid duplication
        });

        // Extract <style> tags with @import
        const styleTags = doc.querySelectorAll('style');
        styleTags.forEach(style => {
          if (style.textContent?.includes('@import')) {
            const newStyle = document.createElement('style');
            newStyle.textContent = style.textContent;
            document.head.appendChild(newStyle);
            headElementsRef.current.push(newStyle);
            style.remove(); // Remove from the HTML to avoid duplication
          }
        });

        // Remove all <script> tags from HTML to avoid duplicate execution
        const scriptTags = doc.querySelectorAll('script');
        scriptTags.forEach(script => script.remove());

        // Extract only the body content for rendering
        // This avoids having duplicate <html>, <head>, <body> tags
        const bodyContent = doc.body?.innerHTML || form.customHtml;
        setProcessedHtml(bodyContent);
      }

      // Process CSS to extract @import statements
      if (form.customCss) {
        // Regex to match @import statements - improved to capture full URLs
        const importRegex = /@import\s+url\(['"]([^'"]+)['"]\)[^;]*;/gi;
        const imports: string[] = [];
        let match;
        
        // Extract all @import URLs
        while ((match = importRegex.exec(form.customCss)) !== null) {
          imports.push(match[1]); // The URL is in capture group 1
        }

        // Create <link> tags for each @import
        imports.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
          headElementsRef.current.push(link);
        });

        // Remove @import statements from CSS to avoid duplication
        const cleanedCss = form.customCss.replace(importRegex, '').trim();
        setProcessedCss(cleanedCss);
      }

      // Inject custom JavaScript using eval to avoid const redeclaration errors
      if (form.customJs) {
        // Use eval to execute JavaScript - it allows re-execution without const redeclaration errors
        // in development mode (hot reload). In production this won't be an issue.
        try {
          // Execute in a delayed manner to ensure DOM is ready
          setTimeout(() => {
            try {
              // Using indirect eval to run in global scope
              (0, eval)(form.customJs);
            } catch (error: any) {
              if (!error.message?.includes('already been declared')) {
                console.error('Error en JavaScript personalizado:', error);
              }
            }
          }, 100);
        } catch (error) {
          console.error('Error al cargar JavaScript:', error);
        }
      }
    }

    // Cleanup on unmount
    return () => {
      headElementsRef.current.forEach(el => el.remove());
      headElementsRef.current = [];
      if (scriptElementRef.current) {
        scriptElementRef.current.remove();
        scriptElementRef.current = null;
      }
    };
  }, [form?.builderMode, form?.customHtml, form?.customCss, form?.customJs]);

  const submitMutation = useMutation({
    mutationFn: () => submitPublicForm(id!, { answers, email, urlParams }),
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "¡Formulario enviado!",
        description: "Tu respuesta ha sido registrada correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el formulario. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Evaluate if a field should be shown based on conditional logic
  const shouldShowField = (field: FormField): boolean => {
    if (!field.conditionalLogic || !field.conditionalLogic.enabled || !field.conditionalLogic.conditions.length) {
      return true;
    }

    const { logicType, conditions } = field.conditionalLogic;

    const evaluateCondition = (condition: ConditionalLogic['conditions'][0]): boolean => {
      const answer = answers[condition.fieldId];
      
      switch (condition.operator) {
        case "equals":
          if (Array.isArray(answer)) {
            return answer.includes(condition.value);
          }
          return answer === condition.value;
        
        case "not_equals":
          if (Array.isArray(answer)) {
            return !answer.includes(condition.value);
          }
          return answer !== condition.value;
        
        case "contains":
          if (Array.isArray(answer)) {
            return answer.includes(condition.value);
          }
          return false;
        
        default:
          return false;
      }
    };

    if (logicType === "and") {
      return conditions.every(evaluateCondition);
    } else {
      return conditions.some(evaluateCondition);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;

    // Validate required fields that are visible
    const visibleFields = form.fields.filter(shouldShowField);
    for (const field of visibleFields) {
      if (field.required && !answers[field.id]) {
        toast({
          title: "Campos requeridos",
          description: `El campo "${field.label}" es obligatorio.`,
          variant: "destructive",
        });
        return;
      }
    }

    submitMutation.mutate();
  };

  // Use ref to keep urlParams up to date without re-running the effect
  const urlParamsRef = useRef(urlParams);
  useEffect(() => {
    urlParamsRef.current = urlParams;
  }, [urlParams]);

  // Expose submit function and execute custom JS for code-mode forms
  useEffect(() => {
    if (form?.builderMode === 'code' && typeof window !== 'undefined') {
      // Expose submit function for custom forms
      (window as any).submitCustomForm = async (formData: Record<string, any>) => {
        try {
          const response = await submitPublicForm(id!, { 
            answers: formData, 
            email: formData.email || '',
            urlParams: urlParamsRef.current
          });
          
          setSubmitted(true);
          toast({
            title: "¡Formulario enviado!",
            description: "Tu respuesta ha sido registrada correctamente.",
          });
          
          return { success: true, data: response };
        } catch (error) {
          toast({
            title: "Error",
            description: "No se pudo enviar el formulario. Inténtalo de nuevo.",
            variant: "destructive",
          });
          return { success: false, error };
        }
      };

      // Execute custom JavaScript only once
      if (form.customJs) {
        try {
          const scriptId = 'custom-form-script';
          // Remove existing script if any
          const existingScript = document.getElementById(scriptId);
          if (existingScript) {
            existingScript.remove();
          }
          
          const script = document.createElement('script');
          script.id = scriptId;
          script.textContent = form.customJs;
          document.body.appendChild(script);
          
          // Cleanup
          return () => {
            const scriptToRemove = document.getElementById(scriptId);
            if (scriptToRemove) {
              scriptToRemove.remove();
            }
            delete (window as any).submitCustomForm;
          };
        } catch (error) {
          console.error('Error executing custom JS:', error);
        }
      }
    }
  }, [form, id, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-form">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    // Extract error message from the error response
    const errorMessage = (error as any)?.message || "Formulario no encontrado o no disponible";
    const availableFrom = (error as any)?.availableFrom;
    const availableUntil = (error as any)?.availableUntil;
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-3">
            <p className="text-center text-muted-foreground">
              {errorMessage}
            </p>
            {availableFrom && (
              <p className="text-center text-sm text-muted-foreground">
                Disponible a partir de: {new Date(availableFrom).toLocaleDateString("es-ES", { 
                  dateStyle: "long" 
                })}
              </p>
            )}
            {availableUntil && (
              <p className="text-center text-sm text-muted-foreground">
                Estuvo disponible hasta: {new Date(availableUntil).toLocaleDateString("es-ES", { 
                  dateStyle: "long" 
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold">¡Gracias!</h2>
              <p className="text-muted-foreground mt-2">
                Tu respuesta ha sido enviada correctamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {form.builderMode === 'code' ? (
        // Modo código: ancho completo, sin restricciones
        <div className="w-full h-full">
          <div dangerouslySetInnerHTML={{ __html: processedHtml || form.customHtml || '' }} />
          <style>{processedCss || form.customCss}</style>
        </div>
      ) : (
        // Modo visual: layout con Card y máximo ancho
        <div className="py-12">
          <div className="container mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl" data-testid="text-form-title">{form.title}</CardTitle>
                {form.description && (
                  <CardDescription className="text-base">{form.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                  />
                </div>

                {form.fields.filter(shouldShowField).map((field: FormField) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {field.type === 'text' && (
                    <Input
                      id={field.id}
                      type="text"
                      placeholder={field.placeholder || ''}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      required={field.required}
                      data-testid={`input-field-${field.id}`}
                    />
                  )}

                  {field.type === 'email' && (
                    <Input
                      id={field.id}
                      type="email"
                      placeholder={field.placeholder || ''}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      required={field.required}
                      data-testid={`input-field-${field.id}`}
                    />
                  )}

                  {field.type === 'number' && (
                    <Input
                      id={field.id}
                      type="number"
                      placeholder={field.placeholder || ''}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      required={field.required}
                      data-testid={`input-field-${field.id}`}
                    />
                  )}

                  {field.type === 'textarea' && (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder || ''}
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      required={field.required}
                      rows={4}
                      data-testid={`input-field-${field.id}`}
                    />
                  )}

                  {field.type === 'select' && field.options && (
                    <Select
                      value={answers[field.id] || ''}
                      onValueChange={(value) => setAnswers({ ...answers, [field.id]: value })}
                      required={field.required}
                    >
                      <SelectTrigger data-testid={`input-field-${field.id}`}>
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option: string, idx: number) => (
                          <SelectItem key={idx} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.type === 'checkbox' && field.options && (
                    <div className="space-y-2">
                      {field.options.map((option: string, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.id}-${idx}`}
                            checked={(answers[field.id] || []).includes(option)}
                            onCheckedChange={(checked) => {
                              const current = answers[field.id] || [];
                              setAnswers({
                                ...answers,
                                [field.id]: checked
                                  ? [...current, option]
                                  : current.filter((o: string) => o !== option),
                              });
                            }}
                            data-testid={`checkbox-${field.id}-${idx}`}
                          />
                          <Label htmlFor={`${field.id}-${idx}`} className="font-normal">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {field.type === 'radio' && field.options && (
                    <RadioGroup
                      value={answers[field.id] || ''}
                      onValueChange={(value) => setAnswers({ ...answers, [field.id]: value })}
                      required={field.required}
                    >
                      <div className="space-y-2">
                        {field.options.map((option: string, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <RadioGroupItem
                              id={`${field.id}-${idx}`}
                              value={option}
                              data-testid={`radio-${field.id}-${idx}`}
                            />
                            <Label htmlFor={`${field.id}-${idx}`} className="font-normal">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  {field.type === 'date' && (
                    <Input
                      id={field.id}
                      type="date"
                      value={answers[field.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      required={field.required}
                      data-testid={`input-field-${field.id}`}
                    />
                  )}
                </div>
              ))}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  style={{ backgroundColor: form.submitButtonColor }}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    form.submitButtonText || 'Enviar respuesta'
                  )}
                </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
