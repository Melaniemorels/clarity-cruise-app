import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Check, UserPlus, UserCheck, UserX, Heart, MessageCircle, X, Loader2, CalendarHeart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationType 
} from "@/hooks/use-notifications";
import {
  useFollowRequests,
  useAcceptRequest,
  useRejectRequest,
} from "@/hooks/use-follow-requests";

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  new_follower: <UserPlus className="h-4 w-4 text-primary" />,
  follow_request: <UserPlus className="h-4 w-4 text-amber-500" />,
  request_accepted: <UserCheck className="h-4 w-4 text-green-500" />,
  request_rejected: <UserX className="h-4 w-4 text-red-500" />,
  like: <Heart className="h-4 w-4 text-pink-500" />,
  comment: <MessageCircle className="h-4 w-4 text-blue-500" />,
  plan_invite: <CalendarHeart className="h-4 w-4 text-violet-500" />,
};

// Activity types (excluding follow_request which goes to Requests tab)
const activityTypes: NotificationType[] = ["new_follower", "request_accepted", "request_rejected", "like", "comment", "plan_invite"];

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "activity">("requests");
  
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Follow requests
  const { data: followRequests = [], isLoading: requestsLoading } = useFollowRequests();
  const acceptRequest = useAcceptRequest();
  const rejectRequest = useRejectRequest();

  const dateLocale = i18n.language === "es" ? es : enUS;

  // Filter notifications: activity tab shows everything except follow_request type
  const activityNotifications = notifications.filter(n => activityTypes.includes(n.type));

  // Total pending count (requests + unread activity)
  const requestsCount = followRequests.length;
  const totalBadgeCount = unreadCount + requestsCount;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    if (notification.actor_id) {
      setOpen(false);
      navigate(`/profile/${notification.actor_id}`);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest.mutateAsync(requestId);
      toast.success(t("followRequests.accepted"));
    } catch {
      toast.error(t("followRequests.error"));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync(requestId);
      toast.success(t("followRequests.rejected"));
    } catch {
      toast.error(t("followRequests.error"));
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    setOpen(false);
    navigate(`/profile/${userId}`);
  };

  const getNotificationMessage = (notification: typeof notifications[0]) => {
    const actorName = notification.actor?.name || notification.actor?.handle || t("notifications.someone");
    
    switch (notification.type) {
      case "new_follower":
        return t("notifications.newFollower", { name: actorName });
      case "follow_request":
        return t("notifications.followRequest", { name: actorName });
      case "request_accepted":
        return t("notifications.requestAccepted", { name: actorName });
      case "request_rejected":
        return t("notifications.requestRejected", { name: actorName });
      case "like":
        return t("notifications.likedPost", { name: actorName });
      case "comment":
        return t("notifications.commented", { name: actorName });
      case "plan_invite":
        return t("notifications.planInvite", { name: actorName });
      default:
        return notification.message || "";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-theme-textSecondary hover:text-theme-textPrimary transition-colors" strokeWidth={1.4} />
          {totalBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "requests" | "activity")}>
          <div className="flex items-center justify-between p-3 border-b">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="requests" className="text-xs relative">
                {t("notifications.requests")}
                {requestsCount > 0 && (
                  <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-medium text-white flex items-center justify-center">
                    {requestsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs relative">
                {t("notifications.activity")}
                {unreadCount > 0 && (
                  <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Requests Tab */}
          <TabsContent value="requests" className="m-0">
            <ScrollArea className="h-80">
              {requestsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : followRequests.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("notifications.noRequests")}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {followRequests.map((request) => (
                    <div key={request.id} className="flex items-center gap-3 p-4">
                      <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNavigateToProfile(request.follower_id)}
                      >
                        <ProfileAvatar
                          photoUrl={request.requester?.photo_url}
                          handle={request.requester?.handle}
                          name={request.requester?.name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate hover:underline">
                            @{request.requester?.handle || "unknown"}
                          </p>
                          {request.requester?.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {request.requester.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
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
                          onClick={() => handleRejectRequest(request.id)}
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
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="m-0">
            {unreadCount > 0 && (
              <div className="flex justify-end px-4 py-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="text-xs text-muted-foreground h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t("notifications.markAllRead")}
                </Button>
              </div>
            )}
            <ScrollArea className="h-72">
              {notificationsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : activityNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("notifications.noActivity")}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activityNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
                        !notification.is_read && "bg-primary/5"
                      )}
                    >
                      <ProfileAvatar
                        photoUrl={notification.actor?.photo_url}
                        handle={notification.actor?.handle}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {notificationIcons[notification.type]}
                          <p className="text-sm font-medium truncate">
                            {notification.actor?.handle || t("notifications.someone")}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
