import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProfileShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
}

export function ProfileShareSheet({ open, onOpenChange, handle }: ProfileShareSheetProps) {
  const { t } = useTranslation();
  const profileUrl = `${window.location.origin}/u/${handle}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      toast(t("shareProfile.linkCopied"));
      onOpenChange(false);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${handle}`, url: profileUrl });
        onOpenChange(false);
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">{t("shareProfile.title")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start h-12" onClick={handleCopy}>
            <Link2 className="h-4 w-4 mr-3" />
            {t("shareProfile.copyLink")}
          </Button>
          <Button variant="outline" className="w-full justify-start h-12" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-3" />
            {t("shareProfile.share")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
