import { FormBuilderField } from "../FormBuilderField";

export default function FormBuilderFieldExample() {
  return (
    <div className="p-8 max-w-2xl space-y-2">
      <FormBuilderField
        id="1"
        type="text"
        label="Nombre completo"
        required={true}
        placeholder="Ingresa tu nombre"
        onDelete={() => console.log("Delete field 1")}
        onSettings={() => console.log("Settings field 1")}
      />
      <FormBuilderField
        id="2"
        type="email"
        label="Correo electrónico"
        required={true}
        placeholder="ejemplo@correo.com"
        onDelete={() => console.log("Delete field 2")}
        onSettings={() => console.log("Settings field 2")}
      />
      <FormBuilderField
        id="3"
        type="select"
        label="Departamento"
        required={false}
        placeholder="Selecciona una opción"
        onDelete={() => console.log("Delete field 3")}
        onSettings={() => console.log("Settings field 3")}
      />
    </div>
  );
}
