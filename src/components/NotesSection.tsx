import { useState, useEffect, useRef, useMemo } from "react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { es, enUS, type Locale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesSectionProps {
  date: Date;
}

interface NoteRow {
  id: string;
  user_id: string;
  kind: "quick" | "core";
  title: string | null;
  content: string;
  items: { text: string; done: boolean }[] | null;
  pinned: boolean;
  linked_date: string | null;
  created_at: string;
  updated_at: string;
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

export const NotesSection = ({ date }: NotesSectionProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const lang = i18n.language.startsWith("es") ? "es" : "en";
  const dateLocale = lang === "es" ? es : enUS;
  const dateStr = dayKey(date);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [] as NoteRow[];
      const { data, error } = await (supabase as any)
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as NoteRow[];
    },
    enabled: !!user,
  });

  const [filter, setFilter] = useState<"today" | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const visibleNotes = useMemo(() => {
    const list = filter === "today"
      ? notes.filter((n) => n.linked_date === dateStr)
      : notes;
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, filter, dateStr]);

  const todayCount = useMemo(
    () => notes.filter((n) => n.linked_date === dateStr).length,
    [notes, dateStr]
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes", user?.id] });

  const createNote = useMutation({
    mutationFn: async (payload: Partial<NoteRow>) => {
      if (!user) throw new Error("not auth");
      const { data, error } = await (supabase as any)
        .from("notes")
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data as NoteRow;
    },
    onSuccess: invalidate,
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<NoteRow> & { id: string }) => {
      const { error } = await (supabase as any).from("notes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Composer
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    await createNote.mutateAsync({
      kind: "quick",
      content: text,
      linked_date: dateStr,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("notes.title", "Notes")}
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "transition-colors",
              filter === "all" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("notes.all", "All")}
          </button>
          <button
            onClick={() => setFilter("today")}
            className={cn(
              "transition-colors",
              filter === "today" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("notes.today", "Today")}
            {todayCount > 0 && (
              <span className="ml-1 text-muted-foreground">{todayCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Composer — single field, grows on focus */}
      <div className="rounded-lg bg-muted/30 px-3 py-2 transition-colors focus-within:bg-muted/50">
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          onBlur={handleAdd}
          rows={1}
          placeholder={t("notes.quickPlaceholder", "Capture your moment…") as string}
          className="min-h-[24px] text-sm border-0 p-0 focus-visible:ring-0 bg-transparent resize-none leading-snug"
        />
      </div>

      {/* Notes list — Apple Notes style */}
      <div className="space-y-px">
        {visibleNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            {filter === "today"
              ? t("notes.emptyQuick", "Nothing noted today.")
              : t("notes.emptyCore", "Your space is quiet.")}
          </p>
        ) : (
          visibleNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              active={activeId === note.id}
              dateLocale={dateLocale}
              lang={lang}
              onOpen={() => setActiveId((id) => (id === note.id ? null : note.id))}
              onClose={() => setActiveId(null)}
              onPatch={(patch) => updateNote.mutate({ id: note.id, ...patch })}
              onDelete={() => {
                setActiveId(null);
                deleteNote.mutate(note.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

/* ---------------- Note Row (preview + inline editor) ---------------- */

const formatRelative = (iso: string, locale: Locale, lang: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm", { locale });
  if (isYesterday(d)) return lang === "es" ? "Ayer" : "Yesterday";
  const diff = differenceInDays(new Date(), d);
  if (diff < 7) return format(d, "EEEE", { locale });
  return format(d, "d MMM", { locale });
};

const NoteRow = ({
  note,
  active,
  dateLocale,
  lang,
  onOpen,
  onClose,
  onPatch,
  onDelete,
}: {
  note: NoteRow;
  active: boolean;
  dateLocale: Locale;
  lang: string;
  onOpen: () => void;
  onClose: () => void;
  onPatch: (patch: Partial<NoteRow>) => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(note.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setText(note.content), [note.content, note.id]);

  useEffect(() => {
    if (active && editorRef.current) {
      const el = editorRef.current;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 320) + "px";
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [active]);

  const scheduleSave = (next: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (next !== note.content) onPatch({ content: next });
    }, 500);
  };

  const lines = text.split("\n").filter(Boolean);
  const titleLine = lines[0] ?? "";
  const previewLine = lines.slice(1).join(" ").trim();

  if (active) {
    return (
      <div className="rounded-lg bg-muted/30 px-3 py-2.5 my-1">
        <Textarea
          ref={editorRef}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            scheduleSave(v);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 320) + "px";
          }}
          onBlur={() => {
            if (text !== note.content) onPatch({ content: text });
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (text !== note.content) onPatch({ content: text });
              onClose();
            }
          }}
          placeholder={t("notes.contentPlaceholder", "Write freely…") as string}
          className="min-h-[80px] text-sm border-0 p-0 focus-visible:ring-0 bg-transparent resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(note.updated_at, dateLocale, lang)}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPatch({ pinned: !note.pinned })}
              title={t("notes.pin", "Pin") as string}
            >
              <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-current")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-baseline gap-2">
        {note.pinned && (
          <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0 fill-current self-center" />
        )}
        <span className="text-sm font-medium truncate flex-1">
          {titleLine || (
            <span className="text-muted-foreground font-normal italic">
              {t("notes.emptyNote", "Untitled")}
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
          {formatRelative(note.updated_at, dateLocale, lang)}
        </span>
      </div>
      {previewLine && (
        <p className="text-xs text-muted-foreground truncate mt-0.5 ml-0">
          {previewLine}
        </p>
      )}
    </button>
  );
};
