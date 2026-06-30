import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { UserPlus, UserCheck, Clock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFollowStatus, useFollowMutation, useUnfollowMutation, useCancelFollowRequest } from "@/hooks/use-follow-status";

interface FollowButtonProps {
  targetUserId: string;
  targetIsPrivate: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function FollowButton({ targetUserId, targetIsPrivate, className, size = "default" }: FollowButtonProps) {
  const { t } = useTranslation();
  const { data: followStatus, isLoading: statusLoading } = useFollowStatus(targetUserId);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const cancelRequestMutation = useCancelFollowRequest();

  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isLoading = statusLoading || followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending;

  const handleButtonClick = () => {
    if (isLoading) return;

    switch (followStatus) {
      case "none":
        followMutation.mutate({ targetUserId, targetIsPrivate });
        break;
      case "pending":
        setShowCancelDialog(true);
        break;
      case "accepted":
        setShowUnfollowDialog(true);
        break;
      default:
        break;
    }
  };

  const handleUnfollow = () => {
    unfollowMutation.mutate({ targetUserId });
    setShowUnfollowDialog(false);
  };

  const handleCancelRequest = () => {
    cancelRequestMutation.mutate({ targetUserId });
    setShowCancelDialog(false);
  };

  // Don't show for blocked users
  if (followStatus === "blocked") return null;

  const getButtonContent = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    switch (followStatus) {
      case "pending":
        return (
          <>
            <Clock className="h-4 w-4 mr-2" />
            {t("follow.requested")}
          </>
        );
      case "accepted":
        return (
          <>
            <UserCheck className="h-4 w-4 mr-2" />
            {t("follow.following")}
          </>
        );
      default:
        return (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            {t("follow.follow")}
          </>
        );
    }
  };

  const getButtonVariant = () => {
    switch (followStatus) {
      case "pending":
      case "accepted":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <>
      <Button
        className={className}
        variant={getButtonVariant()}
        size={size}
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {getButtonContent()}
      </Button>

      {/* Unfollow Confirmation Dialog */}
      <AlertDialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("follow.unfollowTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("follow.unfollowDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfollow}>
              {t("follow.unfollow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Request Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("follow.cancelRequestTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("follow.cancelRequestDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelRequest}>
              {t("follow.cancelRequest")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
