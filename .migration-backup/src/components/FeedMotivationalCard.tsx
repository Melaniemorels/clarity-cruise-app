import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useMemo, useState, useEffect } from "react";

interface FeedMotivationalCardProps {
  visible: boolean;
  onDismiss: () => void;
}

export function FeedMotivationalCard({ visible, onDismiss }: FeedMotivationalCardProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  // Get today's message index (rotates daily)
  const messageIndex = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return dayOfYear % 5; // 5 messages
  }, []);

  // Check session storage on mount
  useEffect(() => {
    const dismissedToday = sessionStorage.getItem('feedMotivationalDismissed');
    if (dismissedToday === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('feedMotivationalDismissed', 'true');
    onDismiss();
  };

  if (!visible || dismissed) return null;

  const messages = [
    t('socialBudget.motivational.message1'),
    t('socialBudget.motivational.message2'),
    t('socialBudget.motivational.message3'),
    t('socialBudget.motivational.message4'),
    t('socialBudget.motivational.message5'),
  ];

  return (
    <Card className="bg-secondary/50 border-border/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-foreground/80 leading-relaxed flex-1">
          {messages[messageIndex]}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
