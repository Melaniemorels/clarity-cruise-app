import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SocialBudgetModalProps {
  open: boolean;
  onExtend: () => void;
  onReturn: () => void;
  allowExtensions: boolean;
}

export function SocialBudgetModal({ 
  open, 
  onExtend, 
  onReturn, 
  allowExtensions 
}: SocialBudgetModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm mx-4 p-6 bg-card border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {t('socialBudget.modalTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            {t('socialBudget.modalDescription')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-3 mt-6 sm:flex-col">
          {allowExtensions && (
            <Button
              onClick={onExtend}
              className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('socialBudget.extendTime')}
            </Button>
          )}
          <Button
            onClick={onReturn}
            variant="outline"
            className="w-full h-12 text-base font-medium rounded-xl border-border hover:bg-secondary"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('socialBudget.returnToFocus')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
