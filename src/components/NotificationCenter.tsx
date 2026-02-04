import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Check, UserPlus, UserCheck, UserX, Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationType 
} from "@/hooks/use-notifications";

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  new_follower: <UserPlus className="h-4 w-4 text-primary" />,
  follow_request: <UserPlus className="h-4 w-4 text-amber-500" />,
  request_accepted: <UserCheck className="h-4 w-4 text-green-500" />,
  request_rejected: <UserX className="h-4 w-4 text-red-500" />,
  like: <Heart className="h-4 w-4 text-pink-500" />,
  comment: <MessageCircle className="h-4 w-4 text-blue-500" />,
};

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const dateLocale = i18n.language === "es" ? es : enUS;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.type === "follow_request") {
      navigate("/profile?tab=requests");
    } else if (notification.actor_id) {
      // Navigate to actor's profile
      setOpen(false);
      // For now, just close the popover
    }
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
      default:
        return notification.message || "";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" strokeWidth={1.4} style={{ color: '#EAEAEA' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-xs text-muted-foreground"
            >
              <Check className="h-3 w-3 mr-1" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={notification.actor?.photo_url || undefined} />
                    <AvatarFallback>
                      {notification.actor?.handle?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
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
      </PopoverContent>
    </Popover>
  );
}
