import { MessageCircle, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ContactFriendButtonsProps {
  phoneNumber: string;
}

/**
 * External contact actions shown on a friend's profile. VYV deliberately has
 * no built-in chat — these buttons just open the user's preferred apps.
 */
export function ContactFriendButtons({ phoneNumber }: ContactFriendButtonsProps) {
  const { t } = useTranslation();
  const digits = phoneNumber.replace(/[^\d+]/g, "");
  const waDigits = digits.replace(/\D/g, "");
  const isAppleDevice = /iPhone|iPad|Macintosh/.test(navigator.userAgent);

  const open = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="grid grid-cols-3 gap-2 pt-1">
      <Button variant="outline" size="sm" className="w-full" onClick={() => open(`sms:${digits}`)}>
        <MessageCircle className="h-4 w-4 mr-1.5" />
        {t("contactFriend.message")}
      </Button>
      <Button variant="outline" size="sm" className="w-full" onClick={() => open(`tel:${digits}`)}>
        <Phone className="h-4 w-4 mr-1.5" />
        {t("contactFriend.call")}
      </Button>
      {isAppleDevice ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => open(`facetime:${digits}`)}>
          <Video className="h-4 w-4 mr-1.5" />
          FaceTime
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open(`https://wa.me/${waDigits}`, "_blank", "noopener")}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          WhatsApp
        </Button>
      )}
    </div>
  );
}
