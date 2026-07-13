import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveNav, useNavStyle } from "@/components/ResponsiveNav";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { openContent } from "@/lib/open-content";
import { detectProvider, PROVIDER_LABEL_KEYS } from "@/lib/external-link";
import { categoryLabelKey } from "@/lib/explore-categories";
import {
  useSavedItems,
  useToggleSave,
  type SavedItem,
} from "@/hooks/use-saved-items";
import { useRecordOpen } from "@/hooks/use-explorer-progress";
import { ExplorerContentCard } from "@/components/explore/ExplorerContentCard";
import { explorerText } from "@/components/explore/explorer-tokens";

const RECENT_DAYS = 7;

type FilterTab =
  | { kind: "all" }
  | { kind: "recent" }
  | { kind: "provider"; value: string; labelKey: string }
  | { kind: "category"; value: string; labelKey: string };

function tabId(tab: FilterTab): string {
  switch (tab.kind) {
    case "all":
      return "all";
    case "recent":
      return "recent";
    case "provider":
      return `provider:${tab.value}`;
    case "category":
      return `category:${tab.value}`;
  }
}

export default function ExploreSaved() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const device = useDevice();
  const navStyle = useNavStyle();
  const { data: saved, isLoading } = useSavedItems();
  const toggleSave = useToggleSave();
  const recordOpen = useRecordOpen();
  const [activeTab, setActiveTab] = useState("all");

  const items = saved ?? [];

  const tabs = useMemo<FilterTab[]>(() => {
    const providerKeys = new Map<string, string>();
    const categories = new Map<string, string>();
    for (const item of items) {
      if (item.url) {
        const provider = detectProvider(item.url);
        const labelKey = PROVIDER_LABEL_KEYS[provider];
        if (labelKey) providerKeys.set(provider.toString(), labelKey);
      }
      if (item.category) {
        const labelKey = categoryLabelKey(item.category);
        if (labelKey) categories.set(item.category, labelKey);
      }
    }
    return [
      { kind: "all" },
      ...[...providerKeys.entries()].map(
        ([value, labelKey]): FilterTab => ({ kind: "provider", value, labelKey }),
      ),
      ...[...categories.entries()].map(
        ([value, labelKey]): FilterTab => ({ kind: "category", value, labelKey }),
      ),
      { kind: "recent" },
    ];
  }, [items]);

  const filtered = useMemo(() => {
    const tab = tabs.find((tb) => tabId(tb) === activeTab) ?? { kind: "all" as const };
    switch (tab.kind) {
      case "all":
        return items;
      case "recent": {
        const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
        return items.filter((i) => new Date(i.saved_at).getTime() >= cutoff);
      }
      case "provider":
        return items.filter(
          (i) => i.url && detectProvider(i.url).toString() === tab.value,
        );
      case "category":
        return items.filter((i) => i.category === tab.value);
    }
  }, [items, tabs, activeTab]);

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

  const handleUnsave = (item: SavedItem) => {
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
        onSuccess: () => toast.success(t("explore.menu.removedFromSaved")),
        onError: () => toast.error(t("explore.menu.errorGeneric")),
      },
    );
  };

  const tabLabel = (tab: FilterTab): string => {
    switch (tab.kind) {
      case "all":
        return t("explore.saved.tabs.all");
      case "recent":
        return t("explore.saved.tabs.recent");
      case "provider":
      case "category":
        return t(tab.labelKey);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-all duration-300" style={navStyle}>
      <div
        className={cn(
          "space-y-6 transition-all",
          device.isMobile ? "p-4" : device.isTablet ? "p-6" : "p-8 max-w-7xl mx-auto",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/explore")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={cn(explorerText.pageTitle, device.isMobile ? "text-xl" : "text-2xl")}>
              {t("explore.saved.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("explore.saved.subtitle")}</p>
          </div>
        </div>

        {/* Filter pills */}
        {items.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {tabs.map((tab) => (
              <Button
                key={tabId(tab)}
                variant={activeTab === tabId(tab) ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tabId(tab))}
                className="rounded-full text-xs h-7 px-2.5"
              >
                {tabLabel(tab)}
              </Button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-card border border-border/30 p-4 space-y-2"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-muted-foreground">{t("explore.saved.empty")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("explore.saved.emptyHint")}</p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4 items-stretch",
              device.isMobile ? "grid-cols-2" : device.isTablet ? "grid-cols-3" : "grid-cols-4",
            )}
          >
            {filtered.map((item) => (
              <ExplorerContentCard
                key={`${item.provider}:${item.provider_item_id}`}
                title={item.title}
                description={item.description}
                providerLabelKey={item.url ? PROVIDER_LABEL_KEYS[detectProvider(item.url)] : null}
                categoryLabelKey={item.category ? categoryLabelKey(item.category) : null}
                durationMin={item.duration_min}
                language={item.language}
                thumbnail={item.thumbnail}
                layout="grid"
                onOpen={() => handleOpen(item)}
                menu={{
                  saved: true,
                  onToggleSave: () => handleUnsave(item),
                }}
              />
            ))}
          </div>
        )}
      </div>
      <ResponsiveNav />
    </div>
  );
}
