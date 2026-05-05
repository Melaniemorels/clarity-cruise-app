import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { es, enUS, type Locale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus, Search, Pin, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";

interface NoteRow {
  id: string;
  user_id: string;
  kind: "quick" | "core";
  title: string | null;
  content: string;
  pinned: boolean;
  linked_date: string | null;
  created_at: string;
  updated_at: string;
}

const formatRelative = (iso: string, locale: Locale, lang: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm", { locale });
  if (isYesterday(d)) return lang === "es" ? "Ayer" : "Yesterday";
  const diff = differenceInDays(new Date(), d);
  if (diff < 7) return format(d, "EEEE", { locale });
  return format(d, "d MMM", { locale });
};

const Notes = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const lang = i18n.language.startsWith("es") ? "es" : "en";
  const dateLocale = lang === "es" ? es : enUS;

  const linkedDate = params.get("date") ?? format(new Date(), "yyyy-MM-dd");

  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes", user?.id] });

  const createNote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not auth");
      const { data, error } = await (supabase as any)
        .from("notes")
        .insert({
          user_id: user.id,
          kind: "quick",
          content: "",
          linked_date: linkedDate,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as NoteRow;
    },
    onSuccess: (note) => {
      invalidate();
      if (note?.id) setActiveId(note.id);
    },
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? notes.filter(
          (n) =>
            (n.title ?? "").toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
        )
      : notes;
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, search]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  if (activeNote) {
    return (
      <NoteEditor
        note={activeNote}
        dateLocale={dateLocale}
        lang={lang}
        onClose={() => setActiveId(null)}
        onPatch={(patch) => updateNote.mutate({ id: activeNote.id, ...patch })}
        onDelete={() => {
          deleteNote.mutate(activeNote.id);
          setActiveId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold flex-1">
            {t("notes.title", "Notes")}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => createNote.mutate()}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("notes.searchPlaceholder", "Search") as string}
              className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1"
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? t("notes.noResults", "Nothing found")
                : t("notes.emptyCore", "Your space is quiet.")}
            </p>
            {!search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => createNote.mutate()}
                className="text-muted-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t("notes.newNote", "New note")}
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((note) => {
              const lines = note.content.split("\n").filter(Boolean);
              const titleLine = note.title || lines[0] || "";
              const previewLine = (note.title ? lines[0] : lines[1]) ?? "";
              return (
                <li key={note.id}>
                  <button
                    onClick={() => setActiveId(note.id)}
                    className="w-full text-left py-3 group"
                  >
                    <div className="flex items-baseline gap-2">
                      {note.pinned && (
                        <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0 fill-current self-center" />
                      )}
                      <span className="text-[15px] font-medium truncate flex-1">
                        {titleLine || (
                          <span className="text-muted-foreground font-normal italic">
                            {t("notes.emptyNote", "Untitled")}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
                        {formatRelative(note.updated_at, dateLocale, lang)}
                      </span>
                    </div>
                    {previewLine && (
                      <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                        {previewLine}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

/* ---------------- Fullscreen editor ---------------- */

const NoteEditor = ({
  note,
  dateLocale,
  lang,
  onClose,
  onPatch,
  onDelete,
}: {
  note: NoteRow;
  dateLocale: Locale;
  lang: string;
  onClose: () => void;
  onPatch: (patch: Partial<NoteRow>) => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(note.title ?? "");
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [content]);

  const scheduleTitle = (v: string) => {
    setTitle(v);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      if (v !== (note.title ?? "")) onPatch({ title: v });
    }, 400);
  };

  const scheduleContent = (v: string) => {
    setContent(v);
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      if (v !== note.content) onPatch({ content: v });
    }, 400);
  };

  const flush = () => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      if (title !== (note.title ?? "")) onPatch({ title });
    }
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      if (content !== note.content) onPatch({ content });
    }
  };

  const handleClose = () => {
    flush();
    onClose();
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-2"
            onClick={handleClose}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-xs text-muted-foreground flex-1 text-center tabular-nums">
            {formatRelative(note.updated_at, dateLocale, lang)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPatch({ pinned: !note.pinned })}
          >
            <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Input
          value={title}
          onChange={(e) => scheduleTitle(e.target.value)}
          onBlur={flush}
          placeholder={t("notes.titlePlaceholder", "Title") as string}
          className="text-2xl font-semibold border-0 px-0 h-auto py-2 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
        />
        <Textarea
          ref={editorRef}
          autoFocus
          value={content}
          onChange={(e) => scheduleContent(e.target.value)}
          onBlur={flush}
          placeholder={t("notes.contentPlaceholder", "Write freely…") as string}
          className="min-h-[60vh] text-[15px] leading-relaxed border-0 px-0 focus-visible:ring-0 bg-transparent resize-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
};

export default Notes;
