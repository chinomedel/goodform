import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ShareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formTitle: string;
  formUrl: string;
}

export function ShareFormDialog({
  open,
  onOpenChange,
  formTitle,
  formUrl,
}: ShareFormDialogProps) {
  const [shareType, setShareType] = useState<"users" | "public">("users");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-share-form">
        <DialogHeader>
          <DialogTitle>Compartir Formulario</DialogTitle>
          <DialogDescription>
            Configura cómo deseas compartir "{formTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Tipo de acceso</Label>
            <RadioGroup value={shareType} onValueChange={(v) => setShareType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="users" id="users" data-testid="radio-users" />
                <Label htmlFor="users" className="font-normal cursor-pointer">
                  Solo usuarios registrados
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" data-testid="radio-public" />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                  Cualquier persona con el enlace
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>URL del formulario</Label>
            <div className="flex gap-2">
              <Input
                value={formUrl}
                readOnly
                data-testid="input-form-url"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                data-testid="button-copy-url"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {shareType === "users" && (
            <p className="text-sm text-muted-foreground">
              Los usuarios deberán iniciar sesión para acceder al formulario
            </p>
          )}
          {shareType === "public" && (
            <p className="text-sm text-muted-foreground">
              Cualquier persona con este enlace podrá completar el formulario
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)} data-testid="button-save-share">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
