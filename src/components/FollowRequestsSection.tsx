import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  useFollowRequests, 
  useAcceptRequest, 
  useRejectRequest 
} from "@/hooks/use-follow-requests";

export function FollowRequestsSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useFollowRequests();
  const acceptRequest = useAcceptRequest();
  const rejectRequest = useRejectRequest();

  const dateLocale = i18n.language === "es" ? es : enUS;

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest.mutateAsync(requestId);
      toast.success(t("followRequests.accepted"));
    } catch (error) {
      toast.error(t("followRequests.error"));
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync(requestId);
      toast.success(t("followRequests.rejected"));
    } catch (error) {
      toast.error(t("followRequests.error"));
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("followRequests.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("followRequests.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("followRequests.empty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {t("followRequests.title")}
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center gap-3">
            <div 
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={() => handleNavigateToProfile(request.requester_id)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={request.requester?.photo_url || undefined} />
                <AvatarFallback>
                  {request.requester?.handle?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate hover:underline">
                  @{request.requester?.handle || "unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.requester?.name || ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAccept(request.id)}
                disabled={acceptRequest.isPending || rejectRequest.isPending}
                className="h-8 w-8 p-0"
              >
                {acceptRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(request.id)}
                disabled={acceptRequest.isPending || rejectRequest.isPending}
                className="h-8 w-8 p-0"
              >
                {rejectRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
