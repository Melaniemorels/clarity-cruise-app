import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { FeedPost } from "@/components/FeedPost";
import { usePublicEntriesFeed } from "@/hooks/use-entries";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const Home = () => {
  const { t } = useTranslation();
  const { data: entries = [], isLoading, error } = usePublicEntriesFeed();

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="mx-auto max-w-2xl p-4">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-destructive">{t('feed.errorLoading')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('feed.tryReloading')}
              </p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">VYV</h1>
          <div className="text-sm text-muted-foreground">{t('nav.feed')}</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-muted-foreground">{t('feed.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('feed.emptyDescription')}
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <FeedPost
              key={entry.id}
              postId={entry.id}
              userId={entry.user_id}
              userHandle={entry.profiles?.handle || "anonymous"}
              userName={entry.profiles?.name || undefined}
              userPhotoUrl={entry.profiles?.photo_url || undefined}
              photoUrl={entry.photo_url || undefined}
              caption={entry.caption || undefined}
              createdAt={entry.created_at}
              inspireCount={entry.reactions.inspire}
              saveCount={entry.reactions.save}
              hasInspired={entry.userReactions.inspire}
              hasSaved={entry.userReactions.save}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
