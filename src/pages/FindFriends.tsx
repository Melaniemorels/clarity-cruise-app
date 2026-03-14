import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Search, UserPlus, UserCheck, Link2, Contact } from "lucide-react";
import { useSearchProfiles, useFollow } from "@/hooks/use-profile";
import { toast } from "sonner";

const FindFriends = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users = [], isLoading } = useSearchProfiles(searchQuery, true);
  const navStyle = useNavStyle();
  const followMutation = useFollow();

  const handleFollow = (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation();
    followMutation.mutate({ targetUserId: userId, isFollowing });
  };

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

  return (
    <div className="min-h-screen bg-background" style={navStyle}>
      <div className="mx-auto max-w-2xl p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t("findFriends.title")}</h1>
        </div>

        {/* Search by username */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t("findFriends.searchByUser")}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("findFriends.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {searchQuery.trim() && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {isLoading ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">{t("findFriends.searching")}</p>
                ) : users.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">{t("findFriends.noResults")}</p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${u.user_id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.photo_url || undefined} />
                          <AvatarFallback>{u.handle[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">@{u.handle}</p>
                          {u.name && <p className="text-xs text-muted-foreground truncate">{u.name}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={u.is_following ? "outline" : "default"}
                        onClick={(e) => handleFollow(e, u.user_id, u.is_following)}
                        disabled={followMutation.isPending}
                        className="h-8 px-3 text-xs"
                      >
                        {u.is_following ? (
                          <><UserCheck className="h-3.5 w-3.5 mr-1" />{t("findFriends.following")}</>
                        ) : (
                          <><UserPlus className="h-3.5 w-3.5 mr-1" />{t("findFriends.follow")}</>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync contacts */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t("findFriends.syncContacts")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("findFriends.noPermission")}
            </p>
            <Button variant="outline" className="w-full" onClick={() => toast(t("findFriends.comingSoon"))}>
              <Contact className="h-4 w-4 mr-2" />
              {t("findFriends.connectContacts")}
            </Button>
          </CardContent>
        </Card>

        {/* Invite link */}
        <Card>
          <CardContent className="p-4 space-y-3">
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
          </CardContent>
        </Card>
      </div>
      <ResponsiveNav />
    </div>
  );
};

export default FindFriends;
