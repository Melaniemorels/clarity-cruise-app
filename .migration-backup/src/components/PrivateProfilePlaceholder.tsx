import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { FollowButton } from "./FollowButton";
import { useFollowStatus } from "@/hooks/use-follow-status";

interface PrivateProfilePlaceholderProps {
  targetUserId: string;
  targetIsPrivate: boolean;
  sectionName?: string;
}

export function PrivateProfilePlaceholder({
  targetUserId,
  targetIsPrivate,
  sectionName,
}: PrivateProfilePlaceholderProps) {
  const { t } = useTranslation();
  const { data: followStatus } = useFollowStatus(targetUserId);

  const getMessage = () => {
    if (followStatus === "pending") {
      return t("profile.requestPending");
    }
    if (sectionName) {
      return t("profile.sectionPrivate", { section: sectionName });
    }
    return t("profile.privateAccount");
  };

  const getSubMessage = () => {
    if (followStatus === "pending") {
      return t("profile.waitingApproval");
    }
    if (followStatus === "accepted") {
      return t("profile.contentNotAvailable");
    }
    return t("profile.followToSee");
  };

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground mb-1">
          {getMessage()}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {getSubMessage()}
        </p>
        
        {followStatus === "none" && (
          <FollowButton
            targetUserId={targetUserId}
            targetIsPrivate={targetIsPrivate}
          />
        )}
        
        {followStatus === "pending" && (
          <p className="text-sm text-muted-foreground italic">
            {t("profile.requestSentInfo")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
