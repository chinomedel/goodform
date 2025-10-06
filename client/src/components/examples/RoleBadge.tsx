import { RoleBadge } from "../RoleBadge";

export default function RoleBadgeExample() {
  return (
    <div className="flex flex-wrap gap-4 p-8">
      <RoleBadge role="admin" />
      <RoleBadge role="gestor" />
      <RoleBadge role="visualizador" />
    </div>
  );
}
