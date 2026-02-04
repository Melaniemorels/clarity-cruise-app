import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FollowButton } from "@/components/FollowButton";
import { useFollowers, useFollowing, FollowListUser } from "@/hooks/use-follow-list";
import { useAuth } from "@/contexts/AuthContext";

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
  isPrivateLocked?: boolean;
}

export function FollowListModal({
  open,
  onOpenChange,
  userId,
  type,
  isPrivateLocked = false,
}: FollowListModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: followers, isLoading: followersLoading } = useFollowers(
    type === "followers" ? userId : undefined
  );
  const { data: following, isLoading: followingLoading } = useFollowing(
    type === "following" ? userId : undefined
  );

  const users = type === "followers" ? followers : following;
  const isLoading = type === "followers" ? followersLoading : followingLoading;

  const filteredUsers = users?.filter(
    (user) =>
      user.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = (targetUserId: string) => {
    onOpenChange(false);
    if (targetUserId === currentUser?.id) {
      navigate("/profile");
    } else {
      navigate(`/user/${targetUserId}`);
    }
  };

  const title = type === "followers" ? t("profile.followers") : t("profile.following");
  const emptyMessage =
    type === "followers"
      ? t("follow.noFollowersYet")
      : t("follow.notFollowingAnyone");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isPrivateLocked ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("follow.privateInfo")}</p>
          </div>
        ) : (
          <>
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.searchPeople")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-9 w-20 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <UserListItem
                      key={user.user_id}
                      user={user}
                      currentUserId={currentUser?.id}
                      onClick={() => handleUserClick(user.user_id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{emptyMessage}</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface UserListItemProps {
  user: FollowListUser;
  currentUserId?: string;
  onClick: () => void;
}

function UserListItem({ user, currentUserId, onClick }: UserListItemProps) {
  const isCurrentUser = user.user_id === currentUserId;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.photo_url || undefined} alt={user.handle} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-lg">
            {user.handle.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium truncate">@{user.handle}</span>
            {user.is_private && (
              <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          {user.name && (
            <p className="text-sm text-muted-foreground truncate">{user.name}</p>
          )}
        </div>
      </button>

      {!isCurrentUser && (
        <FollowButton
          targetUserId={user.user_id}
          targetIsPrivate={user.is_private}
          size="sm"
        />
      )}
    </div>
  );
}
