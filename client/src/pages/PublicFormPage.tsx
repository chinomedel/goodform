import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPublicForm, submitPublicForm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export default function PublicFormPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ['/api/public/forms', id],
    queryFn: () => getPublicForm(id!),
    enabled: !!id,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitPublicForm(id!, { answers, email }),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-form">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Formulario no encontrado o no disponible
            </p>
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
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-form-title">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base">{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {form.builderMode === 'code' ? (
              <div className="custom-form-container">
                <div dangerouslySetInnerHTML={{ __html: form.customHtml || '' }} />
                <style>{form.customCss}</style>
                <script>{form.customJs}</script>
              </div>
            ) : (
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

                {form.fields.map((field: FormField) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
