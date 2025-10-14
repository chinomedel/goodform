import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Image as ImageIcon, Sparkles, Code2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

interface FormBuilderChatProps {
  formId: string;
  onInsertCode?: (html: string, css: string, js: string) => void;
}

export function FormBuilderChat({ formId, onInsertCode }: FormBuilderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [formId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/forms/${formId}/chat/history`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no puede superar los 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend && !imageFile) return;

    try {
      setIsLoading(true);
      
      // For now, we'll use image preview URL
      // In production, you'd upload to a storage service first
      const response = await fetch(`/api/forms/${formId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          imageUrl: imagePreview || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al enviar mensaje");
      }

      const assistantMessage = await response.json();
      
      // Add user message to UI
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        formId,
        userId: null,
        role: "user",
        content: textToSend,
        imageUrl: imagePreview,
        toolCalls: null,
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setInput("");
      removeImage();

      toast({
        title: "Mensaje enviado",
        description: "El asistente ha respondido",
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Sparkles,
      label: "Generar formulario",
      prompt: "Crea un formulario de contacto moderno con campos para nombre, email, teléfono y mensaje. Usa estilos CSS modernos y asegúrate de agregar data-field-name a cada campo.",
    },
    {
      icon: CheckCircle2,
      label: "Revisar código",
      prompt: "Por favor revisa mi código HTML actual y verifica que todos los campos tengan el atributo data-field-name correctamente configurado. Dame sugerencias de mejora.",
    },
  ];

  const extractCodeBlocks = (content: string) => {
    const htmlMatch = content.match(/```html\n([\s\S]*?)```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)```/);
    const jsMatch = content.match(/```(?:javascript|js)\n([\s\S]*?)```/);

    return {
      html: htmlMatch ? htmlMatch[1].trim() : "",
      css: cssMatch ? cssMatch[1].trim() : "",
      js: jsMatch ? jsMatch[1].trim() : "",
    };
  };

  const handleInsertCode = (content: string) => {
    const { html, css, js } = extractCodeBlocks(content);
    if (onInsertCode && (html || css || js)) {
      onInsertCode(html, css, js);
      toast({
        title: "Código insertado",
        description: "El código se ha insertado en los editores",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Asistente de IA
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Ayuda para generar código HTML/CSS/JS
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Acciones rápidas:</p>
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => sendMessage(action.prompt)}
            disabled={isLoading}
            data-testid={`button-quick-action-${index}`}
          >
            <action.icon className="h-3 w-3 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay mensajes aún</p>
            <p className="text-xs mt-1">Usa las acciones rápidas o escribe tu consulta</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.imageUrl && (
                    <img
                      src={message.imageUrl}
                      alt="Uploaded"
                      className="max-w-full rounded mb-2"
                    />
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  {message.role === "assistant" && onInsertCode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleInsertCode(message.content)}
                      data-testid="button-insert-code"
                    >
                      <Code2 className="h-3 w-3 mr-1" />
                      Insertar código
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t space-y-2">
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded border" />
            <Button
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={removeImage}
              data-testid="button-remove-image"
            >
              ×
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
            data-testid="input-image-file"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            data-testid="button-attach-image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || (!input.trim() && !imageFile)}
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
