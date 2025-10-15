import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

type FieldType = "text" | "email" | "number" | "select" | "checkbox" | "radio" | "date" | "textarea";

interface Field {
  id: string;
  type: FieldType;
  label: string;
  options?: string[];
}

interface Condition {
  fieldId: string;
  operator: "equals" | "not_equals" | "contains";
  value: string;
}

interface ConditionalLogic {
  enabled: boolean;
  logicType: "and" | "or";
  conditions: Condition[];
}

interface ConditionalLogicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFieldId: string;
  allFields: Field[];
  initialLogic?: ConditionalLogic | null;
  onSave: (logic: ConditionalLogic | null) => void;
}

export function ConditionalLogicDialog({
  open,
  onOpenChange,
  currentFieldId,
  allFields,
  initialLogic,
  onSave,
}: ConditionalLogicDialogProps) {
  const [enabled, setEnabled] = useState(false);
  const [logicType, setLogicType] = useState<"and" | "or">("and");
  const [conditions, setConditions] = useState<Condition[]>([]);

  // Filter fields that can be used for conditional logic
  // Only select, checkbox, and radio fields that appear BEFORE the current field
  const currentFieldIndex = allFields.findIndex(f => f.id === currentFieldId);
  const availableFields = allFields.filter((field, index) => 
    index < currentFieldIndex && 
    (field.type === 'select' || field.type === 'checkbox' || field.type === 'radio')
  );

  useEffect(() => {
    if (initialLogic) {
      setEnabled(initialLogic.enabled);
      setLogicType(initialLogic.logicType);
      setConditions(initialLogic.conditions);
    } else {
      setEnabled(false);
      setLogicType("and");
      setConditions([]);
    }
  }, [initialLogic, open]);

  const addCondition = () => {
    if (availableFields.length > 0) {
      const firstField = availableFields[0];
      const firstValue = firstField.options?.[0] || "";
      
      setConditions([
        ...conditions,
        {
          fieldId: firstField.id,
          operator: "equals",
          value: firstValue,
        },
      ]);
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const handleFieldChange = (index: number, fieldId: string) => {
    const selectedField = availableFields.find(f => f.id === fieldId);
    if (selectedField) {
      const firstValue = selectedField.options?.[0] || "";
      updateCondition(index, { fieldId, value: firstValue });
    }
  };

  const handleSave = () => {
    if (!enabled || conditions.length === 0) {
      onSave(null);
    } else {
      onSave({
        enabled,
        logicType,
        conditions,
      });
    }
    onOpenChange(false);
  };

  const getFieldLabel = (fieldId: string) => {
    const field = allFields.find(f => f.id === fieldId);
    return field?.label || "Campo desconocido";
  };

  const getFieldOptions = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    return field?.options || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-conditional-logic">
        <DialogHeader>
          <DialogTitle>Lógica Condicional</DialogTitle>
          <DialogDescription>
            Configura cuándo se debe mostrar este campo basándose en las respuestas de otros campos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar lógica condicional</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar este campo solo cuando se cumplan ciertas condiciones
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-enable-logic"
            />
          </div>

          {enabled && availableFields.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No hay campos disponibles para crear condiciones. Los campos select, checkbox o radio deben aparecer antes de este campo.
              </p>
            </div>
          )}

          {enabled && availableFields.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Mostrar cuando:</Label>
                
                {conditions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay condiciones configuradas
                  </p>
                )}

                {conditions.map((condition, index) => {
                  const selectedField = availableFields.find(f => f.id === condition.fieldId);
                  const fieldOptions = getFieldOptions(condition.fieldId);

                  return (
                    <div key={index} className="flex items-end gap-2 p-3 border rounded-md bg-muted/30">
                      {index > 0 && (
                        <div className="pb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">
                          {logicType}
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Campo</Label>
                            <Select
                              value={condition.fieldId}
                              onValueChange={(value) => handleFieldChange(index, value)}
                            >
                              <SelectTrigger data-testid={`select-field-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Operador</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value: Condition["operator"]) =>
                                updateCondition(index, { operator: value })
                              }
                            >
                              <SelectTrigger data-testid={`select-operator-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">es igual a</SelectItem>
                                <SelectItem value="not_equals">no es igual a</SelectItem>
                                {selectedField?.type === 'checkbox' && (
                                  <SelectItem value="contains">contiene</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Valor</Label>
                            <Select
                              value={condition.value}
                              onValueChange={(value) =>
                                updateCondition(index, { value })
                              }
                            >
                              <SelectTrigger data-testid={`select-value-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeCondition(index)}
                        data-testid={`button-remove-condition-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}

                {conditions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                    className="w-full"
                    data-testid="button-add-condition"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar condición {logicType.toUpperCase()}
                  </Button>
                )}

                {conditions.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={addCondition}
                    className="w-full"
                    data-testid="button-add-first-condition"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar condición
                  </Button>
                )}
              </div>

              {conditions.length > 1 && (
                <div className="space-y-2">
                  <Label>Tipo de lógica</Label>
                  <Select value={logicType} onValueChange={(value: "and" | "or") => setLogicType(value)}>
                    <SelectTrigger data-testid="select-logic-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="and">Todas las condiciones (AND)</SelectItem>
                      <SelectItem value="or">Cualquier condición (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {logicType === "and" 
                      ? "El campo se mostrará solo cuando TODAS las condiciones se cumplan"
                      : "El campo se mostrará cuando CUALQUIERA de las condiciones se cumpla"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
