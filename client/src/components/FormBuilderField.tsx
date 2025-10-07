import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type FieldType = "text" | "email" | "number" | "select" | "checkbox" | "date" | "textarea";

interface FormBuilderFieldProps {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  onDelete?: () => void;
  onSettings?: () => void;
  onLabelChange?: (newLabel: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDragEnd?: () => void;
}

const fieldIcons: Record<FieldType, string> = {
  text: "T",
  email: "@",
  number: "#",
  select: "▼",
  checkbox: "☐",
  date: "📅",
  textarea: "≡",
};

export function FormBuilderField({
  id,
  type,
  label,
  required,
  placeholder,
  options,
  onDelete,
  onSettings,
  onLabelChange,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FormBuilderFieldProps) {
  const needsOptions = type === 'select' || type === 'checkbox';
  
  return (
    <Card 
      className="p-4 mb-2" 
      data-testid={`field-${id}`}
      draggable
      onDragStart={() => onDragStart?.(id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-3">
        <button className="cursor-grab active:cursor-grabbing pt-1 text-muted-foreground hover-elevate p-1 rounded">
          <GripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {fieldIcons[type]}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={label}
                onChange={(e) => onLabelChange?.(e.target.value)}
                placeholder="Nombre del campo"
                className="h-8 text-sm font-medium"
                data-testid={`input-label-${id}`}
              />
              {required && <span className="text-destructive">*</span>}
            </div>
          </div>
          {placeholder && (
            <p className="text-xs text-muted-foreground">{placeholder}</p>
          )}
          {needsOptions && options && options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {options.map((option, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {option}
                </Badge>
              ))}
            </div>
          )}
          {needsOptions && (!options || options.length === 0) && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              ⚠️ Haz clic en configuración para agregar opciones
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSettings}
            data-testid={`button-settings-${id}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-${id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
