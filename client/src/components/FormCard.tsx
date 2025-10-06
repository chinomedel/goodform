import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Edit, Share2, Trash2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FormCardProps {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  responses: number;
  lastModified: string;
  isPublic: boolean;
  onEdit?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onAnalyze?: () => void;
}

export function FormCard({
  id,
  title,
  description,
  status,
  responses,
  lastModified,
  isPublic,
  onEdit,
  onPreview,
  onShare,
  onDelete,
  onAnalyze,
}: FormCardProps) {
  return (
    <Card className="p-4 hover-elevate" data-testid={`card-form-${id}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate" data-testid={`text-form-title-${id}`}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {description}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-form-menu-${id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} data-testid={`menu-edit-${id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPreview} data-testid={`menu-preview-${id}`}>
              <Eye className="h-4 w-4 mr-2" />
              Vista previa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} data-testid={`menu-share-${id}`}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAnalyze} data-testid={`menu-analyze-${id}`}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`menu-delete-${id}`}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status === "published" ? "Publicado" : "Borrador"}
          </Badge>
          {isPublic && (
            <Badge variant="outline" className="text-xs">
              Público
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span data-testid={`text-responses-${id}`}>{responses} respuestas</span>
          <span className="text-xs">{lastModified}</span>
        </div>
      </div>
    </Card>
  );
}
