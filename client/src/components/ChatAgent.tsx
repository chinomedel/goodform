import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any;
  createdAt: string;
}

interface ChatAgentProps {
  formId: string;
}

export function ChatAgent({ formId }: ChatAgentProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history = [], refetch } = useQuery<ChatMessage[]>({
    queryKey: ['/api/forms', formId, 'chat', 'history', 'analyst'],
    queryFn: async () => {
      const response = await fetch(`/api/forms/${formId}/chat/history?agentType=analyst`);
      if (!response.ok) throw new Error('Error al cargar historial');
      return response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const data = await apiRequest("POST", `/api/forms/${formId}/analyst-chat`, { message: msg });
      return data;
    },
    onSuccess: (data: any) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/forms', formId, 'charts'] });
      
      // Si se creó/modificó/eliminó un gráfico, mostrar notificación
      if (data.toolCalls && data.toolCalls.length > 0) {
        const chartActions = data.toolCalls.filter((tc: any) => 
          ['create_chart', 'update_chart', 'delete_chart'].includes(tc.function_name)
        );
        
        if (chartActions.length > 0) {
          toast({
            title: "Acción ejecutada",
            description: "El agente ha modificado los gráficos. Los cambios se reflejarán arriba.",
          });
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/forms/${formId}/chat/history?agentType=analyst`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Historial borrado",
        description: "El historial de chat ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo borrar el historial",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, sendMessageMutation.isPending]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Agente Analista</CardTitle>
          </div>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-clear-history"
                  disabled={clearHistoryMutation.isPending}
                >
                  {clearHistoryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar historial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará toda la conversación con el agente. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-clear">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearHistoryMutation.mutate()}
                    data-testid="button-confirm-clear"
                  >
                    Borrar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <CardDescription>
          Pregúntame sobre los datos o pídeme crear gráficos
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {history.length === 0 && !sendMessageMutation.isPending && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  ¡Hola! Puedo ayudarte a analizar los datos del formulario.
                </p>
                <p className="text-xs mt-2">
                  Ejemplos: "¿Cuál es el NPS promedio?", "Crea un gráfico de barras por región"
                </p>
              </div>
            )}

            {history.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                data-testid={`chat-message-${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {sendMessageMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Escribe tu pregunta o comando..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
