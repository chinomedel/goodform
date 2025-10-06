import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Settings } from "lucide-react";

type FieldType = "text" | "email" | "number" | "select" | "checkbox" | "date" | "textarea";

interface FormBuilderFieldProps {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  onDelete?: () => void;
  onSettings?: () => void;
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
  onDelete,
  onSettings,
}: FormBuilderFieldProps) {
  return (
    <Card className="p-4 mb-2" data-testid={`field-${id}`}>
      <div className="flex items-start gap-3">
        <button className="cursor-grab pt-1 text-muted-foreground hover-elevate p-1 rounded">
          <GripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {fieldIcons[type]}
            </span>
            <h4 className="font-medium text-sm">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </h4>
          </div>
          {placeholder && (
            <p className="text-xs text-muted-foreground">{placeholder}</p>
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
