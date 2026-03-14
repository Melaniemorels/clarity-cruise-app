import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Globe, Lock, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDeleteEntry } from "@/hooks/use-entries";
import { useUpdateEntryVisibility } from "@/hooks/use-entries";
import type { Entry } from "@/hooks/use-entries";
import { toast } from "sonner";

interface CaptureDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: Entry[];
  initialIndex: number;
}

const visibilityOptions = [
  { value: "public" as const, icon: Globe, labelKey: "captureDetail.public" },
  { value: "followers" as const, icon: Eye, labelKey: "captureDetail.followers" },
  { value: "private" as const, icon: Lock, labelKey: "captureDetail.private" },
];

export function CaptureDetailModal({
  open,
  onOpenChange,
  entries,
  initialIndex,
}: CaptureDetailModalProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteEntry = useDeleteEntry();
  const updateVisibility = useUpdateEntryVisibility();

  const entry = entries[currentIndex];
  if (!entry) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < entries.length - 1;

  const handleDelete = () => {
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        if (entries.length <= 1) {
          onOpenChange(false);
        } else if (currentIndex >= entries.length - 1) {
          setCurrentIndex(currentIndex - 1);
        }
      },
    });
  };

  const handleVisibilityChange = (visibility: "public" | "followers" | "private") => {
    if (visibility === entry.visibility) return;
    updateVisibility.mutate({ entryId: entry.id, visibility });
  };

  const currentVisibility = visibilityOptions.find((v) => v.value === entry.visibility);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-card border-border rounded-2xl [&>button]:hidden" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>{t("captureDetail.delete")}</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              {format(parseISO(entry.occurred_at), "d MMM yyyy · HH:mm")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image area with navigation */}
          <div className="relative bg-black/5 dark:bg-black/20">
            {entry.photo_url ? (
              <img
                src={entry.photo_url}
                alt={entry.caption || t('calendar.capture')}
                className="w-full max-h-[60vh] object-contain"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-6xl bg-gradient-to-br from-primary/10 to-secondary/10">
                📸
              </div>
            )}

            {/* Nav arrows */}
            {hasPrev && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-background transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Counter */}
            {entries.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                {currentIndex + 1} / {entries.length}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-4 space-y-4">
            {/* Caption */}
            {entry.caption && (
              <p className="text-sm leading-relaxed">{entry.caption}</p>
            )}

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Visibility selector */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("captureDetail.visibility")}
              </span>
              <div className="flex gap-2">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = entry.visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleVisibilityChange(option.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("captureDetail.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("captureDetail.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("captureDetail.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
