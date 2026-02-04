import { useTranslation } from "react-i18next";
import { Pencil, FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChangeRoutineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOption: (option: "manual" | "templates" | "ai") => void;
}

export function ChangeRoutineModal({
  open,
  onOpenChange,
  onSelectOption,
}: ChangeRoutineModalProps) {
  const { t } = useTranslation();

  const options = [
    {
      id: "manual" as const,
      icon: Pencil,
      title: t("perfectDay.modal.manual"),
      description: t("perfectDay.modal.manualDesc"),
      available: false,
    },
    {
      id: "templates" as const,
      icon: FileText,
      title: t("perfectDay.modal.templates"),
      description: t("perfectDay.modal.templatesDesc"),
      available: false,
    },
    {
      id: "ai" as const,
      icon: Sparkles,
      title: t("perfectDay.modal.aiRecommended"),
      description: t("perfectDay.modal.aiRecommendedDesc"),
      available: false,
    },
  ];

  const handleSelect = (optionId: "manual" | "templates" | "ai") => {
    toast.info(t("perfectDay.modal.comingSoon"));
    // onSelectOption(optionId);
    // onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("perfectDay.modal.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className="w-full flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <option.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{option.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 self-center"
              >
                {t("perfectDay.modal.select")}
              </Button>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
