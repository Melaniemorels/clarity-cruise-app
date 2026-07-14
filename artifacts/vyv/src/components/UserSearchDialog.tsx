import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, UserPlus, UserCheck, X, Link2, Contact, Loader2 } from "lucide-react";
import { useSearchProfiles, useFollow } from "@/hooks/use-profile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactMatch {
  user_id: string;
  handle: string;
  name: string | null;
  photo_url: string | null;
}

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchDialog({ open, onOpenChange }: UserSearchDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useSearchProfiles(searchQuery, open);
  const followMutation = useFollow();
  const [contactMatches, setContactMatches] = useState<ContactMatch[] | null>(null);
  const [matchingContacts, setMatchingContacts] = useState(false);

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}`;
    navigator.clipboard.writeText(url).then(() => {
      toast(t("findFriends.linkCopied"));
    });
  };

  const handleShareInvite = async () => {
    const url = `${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "VYV", text: t("findFriends.joinVYV"), url });
      } catch { /* user cancelled */ }
    } else {
      handleCopyInviteLink();
    }
  };

  const handleConnectContacts = async () => {
    const contactsApi = (navigator as any).contacts;
    if (!contactsApi?.select) {
      toast(t("findFriends.contactsUnsupported"));
      return;
    }
    try {
      const picked = await contactsApi.select(["email", "tel"], { multiple: true });
      if (!picked?.length) return;
      const emails = picked.flatMap((c: any) => c.email ?? []);
      const phones = picked.flatMap((c: any) => c.tel ?? []);
      setMatchingContacts(true);
      const { data, error } = await supabase.functions.invoke("match-contacts", {
        body: { emails, phones },
      });
      if (error) throw error;
      setContactMatches((data as any)?.matches ?? []);
    } catch (err: any) {
      // User cancelling the picker is not an error worth surfacing
      if (err?.name !== "AbortError") toast.error(t("common.error"));
    } finally {
      setMatchingContacts(false);
    }
  };

  const handleFollow = (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation(); // Prevent navigation when clicking follow button
    followMutation.mutate({ targetUserId: userId, isFollowing });
  };

  const handleNavigateToProfile = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
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
            <div className="py-6 space-y-6">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>{t('userSearch.searchByHandle')}</p>
              </div>

              {/* Connect contacts */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{t("findFriends.syncContacts")}</h3>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleConnectContacts}
                  disabled={matchingContacts}
                >
                  {matchingContacts ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Contact className="h-4 w-4 mr-2" />
                  )}
                  {t("findFriends.connectContacts")}
                </Button>
                {contactMatches !== null && (
                  contactMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t("findFriends.noContactMatches")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {contactMatches.map((m) => (
                        <div
                          key={m.user_id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleNavigateToProfile(m.user_id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={m.photo_url || undefined} />
                              <AvatarFallback>{m.handle[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">@{m.handle}</p>
                              {m.name && <p className="text-xs text-muted-foreground truncate">{m.name}</p>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => handleFollow(e, m.user_id, false)}
                            disabled={followMutation.isPending}
                            className="h-8 px-3 text-xs"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            {t("findFriends.follow")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Invite with link */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{t("findFriends.inviteWithLink")}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopyInviteLink}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {t("findFriends.copyLink")}
                  </Button>
                  <Button className="flex-1" onClick={handleShareInvite}>
                    {t("findFriends.share")}
                  </Button>
                </div>
              </div>
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
              {users.map((searchUser: any) => (
                <div
                  key={searchUser.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors active:scale-[0.98] cursor-pointer"
                  onClick={() => handleNavigateToProfile(searchUser.user_id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={searchUser.photo_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {searchUser.handle[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-base hover:underline">
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
                    onClick={(e) => handleFollow(e, searchUser.user_id, searchUser.is_following)}
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
