import { ShareFormDialog } from "../ShareFormDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ShareFormDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Abrir Diálogo de Compartir</Button>
      <ShareFormDialog
        open={open}
        onOpenChange={setOpen}
        formTitle="Encuesta de Satisfacción"
        formUrl="https://goodform.app/f/abc123"
      />
    </div>
  );
}
