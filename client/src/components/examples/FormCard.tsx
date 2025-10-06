import { FormCard } from "../FormCard";

export default function FormCardExample() {
  return (
    <div className="p-8 space-y-4 max-w-2xl">
      <FormCard
        id="1"
        title="Encuesta de Satisfacción del Cliente"
        description="Formulario para evaluar la experiencia del cliente"
        status="published"
        responses={142}
        lastModified="Hace 2 horas"
        isPublic={true}
        onEdit={() => console.log("Edit triggered")}
        onPreview={() => console.log("Preview triggered")}
        onShare={() => console.log("Share triggered")}
        onDelete={() => console.log("Delete triggered")}
        onAnalyze={() => console.log("Analyze triggered")}
      />
      <FormCard
        id="2"
        title="Registro de Eventos 2024"
        description="Formulario de inscripción para eventos corporativos"
        status="draft"
        responses={0}
        lastModified="Hace 1 día"
        isPublic={false}
        onEdit={() => console.log("Edit triggered")}
        onPreview={() => console.log("Preview triggered")}
        onShare={() => console.log("Share triggered")}
        onDelete={() => console.log("Delete triggered")}
        onAnalyze={() => console.log("Analyze triggered")}
      />
    </div>
  );
}
