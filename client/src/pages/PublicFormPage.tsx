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
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Función para manejar envío desde iframe
  useEffect(() => {
    const handleIframeSubmit = async (event: MessageEvent) => {
      // Validar origen y source del mensaje
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (event.data.type === 'CUSTOM_FORM_SUBMIT') {
        const requestId = event.data.requestId;
        
        try {
          const result = await submitPublicForm(id!, { 
            answers: event.data.data, 
            email: event.data.data.email || '', 
            urlParams 
          });
          
          const responseData = result.ok ? await result.json() : null;
          
          // Enviar respuesta al iframe con data del backend
          iframeRef.current?.contentWindow?.postMessage({
            type: 'CUSTOM_FORM_SUBMIT_RESPONSE',
            requestId,
            success: result.ok,
            data: responseData
          }, '*');

          if (result.ok) {
            setSubmitted(true);
            toast({
              title: "¡Formulario enviado!",
              description: "Tu respuesta ha sido registrada correctamente.",
            });
          } else {
            toast({
              title: "Error",
              description: "No se pudo enviar el formulario. Inténtalo de nuevo.",
              variant: "destructive",
            });
          }
        } catch (error) {
          // Enviar respuesta de error al iframe
          iframeRef.current?.contentWindow?.postMessage({
            type: 'CUSTOM_FORM_SUBMIT_RESPONSE',
            requestId,
            success: false,
            data: null
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleIframeSubmit);
    return () => window.removeEventListener('message', handleIframeSubmit);
  }, [id, urlParams, toast]);

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
        // Modo código: usar iframe para HTML completo con Google Fonts
        <iframe
          ref={iframeRef}
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${(form.googleFontsUrls || []).map((url: string) => `<link rel="stylesheet" href="${url.replace(/&amp;/g, '&')}">`).join('\n')}
                <style>
                  body { 
                    margin: 0; 
                    padding: 0; 
                  }
                  ${form.customCss || ''}
                </style>
              </head>
              <body>
                ${form.customHtml || ''}
                <script>
                  // Mapa de promesas pendientes
                  const pendingRequests = new Map();
                  let requestCounter = 0;
                  
                  // Escuchar respuestas del parent
                  window.addEventListener('message', (event) => {
                    if (event.data.type === 'CUSTOM_FORM_SUBMIT_RESPONSE') {
                      const { requestId, success, data } = event.data;
                      const resolve = pendingRequests.get(requestId);
                      if (resolve) {
                        pendingRequests.delete(requestId);
                        resolve({ success, data });
                      }
                    }
                  });
                  
                  // Función global para enviar el formulario
                  async function submitCustomForm(data) {
                    return new Promise((resolve) => {
                      const requestId = ++requestCounter;
                      pendingRequests.set(requestId, resolve);
                      
                      window.parent.postMessage({ 
                        type: 'CUSTOM_FORM_SUBMIT', 
                        requestId,
                        data 
                      }, '*');
                      
                      // Timeout de seguridad
                      setTimeout(() => {
                        if (pendingRequests.has(requestId)) {
                          pendingRequests.delete(requestId);
                          resolve({ success: false, error: 'Timeout' });
                        }
                      }, 30000);
                    });
                  }
                  
                  ${form.customJs || ''}
                </script>
              </body>
            </html>
          `}
          className="w-full h-screen border-0"
          title="Custom Form"
          sandbox="allow-scripts"
        />
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
