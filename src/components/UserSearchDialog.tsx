import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck, X } from "lucide-react";
import { useSearchProfiles, useFollow } from "@/hooks/use-profile";
import { useTranslation } from "react-i18next";

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchDialog({ open, onOpenChange }: UserSearchDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useSearchProfiles(searchQuery, open);
  const followMutation = useFollow();

  const handleFollow = (userId: string, isFollowing: boolean) => {
    followMutation.mutate({ targetUserId: userId, isFollowing });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{t('userSearch.title')}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border sticky top-[60px] bg-background z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t('userSearch.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-base"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {!searchQuery.trim() ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg">{t('userSearch.searchByHandle')}</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p>{t('userSearch.searching')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">{t('userSearch.noUsersFound')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={searchUser.photo_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {searchUser.handle[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-base">
                        @{searchUser.handle}
                      </p>
                      {searchUser.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {searchUser.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={searchUser.is_following ? "outline" : "default"}
                    onClick={() => handleFollow(searchUser.user_id, searchUser.is_following)}
                    disabled={followMutation.isPending}
                    className="flex-shrink-0 h-9 px-4"
                  >
                    {searchUser.is_following ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        {t('userSearch.following')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        {t('userSearch.follow')}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
