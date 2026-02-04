import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Lock, Globe, FileText, Calendar, Heart } from "lucide-react";
import { useSectionVisibility, SectionVisibility } from "@/hooks/use-section-visibility";

interface SectionItemProps {
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
  value: SectionVisibility;
  onChange: (value: SectionVisibility) => void;
  disabled?: boolean;
}

const SectionItem = ({ 
  icon: Icon, 
  titleKey, 
  descriptionKey, 
  value, 
  onChange, 
  disabled 
}: SectionItemProps) => {
  const { t } = useTranslation();
  const isPublic = value === "public";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">{t(titleKey)}</Label>
          <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPublic ? (
          <Globe className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
        <Switch
          checked={isPublic}
          onCheckedChange={(checked) => onChange(checked ? "public" : "private")}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export const SectionVisibilitySettings = () => {
  const { t } = useTranslation();
  const { settings, loading, updateSetting } = useSectionVisibility();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("privacy.sectionVisibility.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("privacy.sectionVisibility.title")}</CardTitle>
        <CardDescription>{t("privacy.sectionVisibility.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <SectionItem
          icon={FileText}
          titleKey="privacy.sectionVisibility.posts"
          descriptionKey="privacy.sectionVisibility.postsDescription"
          value={settings.posts_visibility}
          onChange={(value) => updateSetting("posts_visibility", value)}
        />
        
        <div className="border-t border-border" />
        
        <SectionItem
          icon={Calendar}
          titleKey="privacy.sectionVisibility.calendar"
          descriptionKey="privacy.sectionVisibility.calendarDescription"
          value={settings.calendar_visibility}
          onChange={(value) => updateSetting("calendar_visibility", value)}
        />
        
        <div className="border-t border-border" />
        
        <SectionItem
          icon={Heart}
          titleKey="privacy.sectionVisibility.wellness"
          descriptionKey="privacy.sectionVisibility.wellnessDescription"
          value={settings.wellness_visibility}
          onChange={(value) => updateSetting("wellness_visibility", value)}
        />
      </CardContent>
    </Card>
  );
};
