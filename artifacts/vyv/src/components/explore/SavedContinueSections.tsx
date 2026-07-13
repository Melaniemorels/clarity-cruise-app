import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDevice } from "@/hooks/use-device";
import { Bookmark, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { categoryLabelKey } from "@/lib/explore-categories";
import {
  useSavedItems,
  useToggleSave,
  type SavedItem,
} from "@/hooks/use-saved-items";
import {
  useContinueItems,
  useMarkCompleted,
  useRemoveProgress,
  type ProgressItem,
} from "@/hooks/use-explorer-progress";
import { useRecordOpen } from "@/hooks/use-explorer-progress";
import { ExplorerContentCard } from "./ExplorerContentCard";
import { explorerText, sectionTitleSize } from "./explorer-tokens";

function itemProviderLabelKey(url: string | null): string | undefined {
  if (!url) return undefined;
  return PROVIDER_LABEL_KEYS[detectProvider(url)];
}

/** "Guardados" rail on the Explore page. Hidden while empty. */
export function SavedSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const navigate = useNavigate();
  const { data: saved, isLoading } = useSavedItems();
  const toggleSave = useToggleSave();
  const recordOpen = useRecordOpen();

  if (isLoading || !saved || saved.length === 0) return null;

  const handleOpen = async (item: SavedItem) => {
    if (!item.url) return;
    recordOpen.mutate({
      provider: item.provider,
      providerItemId: item.provider_item_id,
      title: item.title,
      description: item.description,
      url: item.url,
      category: item.category,
      language: item.language,
      durationMin: item.duration_min,
      thumbnail: item.thumbnail,
      creator: item.creator,
    });
    await openContent({ url: item.url, title: item.title }, t);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bookmark className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
            {t("explore.saved.title")}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80 font-medium h-7 px-2"
          onClick={() => navigate("/explore/saved")}
        >
          {t("common.viewAll")}
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {saved.slice(0, 10).map((item) => (
            <ExplorerContentCard
              key={`${item.provider}:${item.provider_item_id}`}
              title={item.title}
              description={item.description}
              providerLabelKey={itemProviderLabelKey(item.url)}
              categoryLabelKey={item.category ? categoryLabelKey(item.category) : null}
              durationMin={item.duration_min}
              language={item.language}
              thumbnail={item.thumbnail}
              gradient="from-slate-800/50 to-zinc-900/40"
              icon={Bookmark}
              layout="carousel"
              onOpen={() => handleOpen(item)}
              menu={{
                saved: true,
                onToggleSave: () => {
                  toggleSave.mutate(
                    {
                      ref: {
                        provider: item.provider,
                        providerItemId: item.provider_item_id,
                        title: item.title,
                      },
                      saved: true,
                    },
                    {
                      onSuccess: () =>
                        toast.success(t("explore.menu.removedFromSaved")),
                      onError: () => toast.error(t("explore.menu.errorGeneric")),
                    },
                  );
                },
              }}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/** "Continuar" rail — opened but not completed. Hidden while empty. */
export function ContinueSection() {
  const { t } = useTranslation();
  const device = useDevice();
  const { data: items, isLoading } = useContinueItems();
  const markCompleted = useMarkCompleted();
  const removeProgress = useRemoveProgress();
  const recordOpen = useRecordOpen();

  if (isLoading || items.length === 0) return null;

  const toRef = (item: ProgressItem) => ({
    provider: item.provider,
    providerItemId: item.provider_item_id,
    title: item.title,
    description: item.description,
    url: item.url,
    category: item.category,
    language: item.language,
    durationMin: item.duration_min,
    thumbnail: item.thumbnail,
    creator: item.creator,
  });

  const handleOpen = async (item: ProgressItem) => {
    if (!item.url) return;
    recordOpen.mutate(toRef(item));
    await openContent({ url: item.url, title: item.title }, t);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <PlayCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className={cn(explorerText.sectionTitle, sectionTitleSize(device.isMobile))}>
          {t("explore.continueSection.title")}
        </h2>
      </div>
      <p className={cn(explorerText.sectionSubtitle, "-mt-1")}>
        {t("explore.continueSection.subtitle")}
      </p>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className={cn("flex items-stretch pb-4", device.isMobile ? "gap-3" : "gap-4")}>
          {items.slice(0, 10).map((item) => (
            <ExplorerContentCard
              key={`${item.provider}:${item.provider_item_id}`}
              title={item.title}
              description={item.description}
              providerLabelKey={itemProviderLabelKey(item.url)}
              categoryLabelKey={item.category ? categoryLabelKey(item.category) : null}
              durationMin={item.duration_min}
              language={item.language}
              thumbnail={item.thumbnail}
              gradient="from-indigo-900/50 to-blue-900/40"
              icon={PlayCircle}
              layout="carousel"
              onOpen={() => handleOpen(item)}
              menu={{
                onMarkCompleted: () => {
                  markCompleted.mutate(toRef(item), {
                    onSuccess: () =>
                      toast.success(t("explore.menu.completedToast")),
                    onError: () => toast.error(t("explore.menu.errorGeneric")),
                  });
                },
                onRemoveFromHistory: () => {
                  removeProgress.mutate(
                    {
                      provider: item.provider,
                      providerItemId: item.provider_item_id,
                    },
                    {
                      onError: () => toast.error(t("explore.menu.errorGeneric")),
                    },
                  );
                },
              }}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
