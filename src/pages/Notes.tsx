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
import {
  ChevronLeft,
  Plus,
  Search,
  Pin,
  Trash2,
  Share,
  Bold,
  Italic,
  CheckSquare,
  Paperclip,
  MoreHorizontal,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
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

  const duplicateNote = useMutation({
    mutationFn: async (n: NoteRow) => {
      if (!user) throw new Error("not auth");
      const { data, error } = await (supabase as any)
        .from("notes")
        .insert({
          user_id: user.id,
          kind: n.kind,
          content: n.content,
          title: n.title,
          linked_date: n.linked_date,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as NoteRow;
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
        onClose={(finalContent) => {
          // If the note is empty on exit, drop it from the list
          if (!finalContent || !finalContent.trim()) {
            deleteNote.mutate(activeNote.id);
          }
          setActiveId(null);
        }}
        onPatch={(patch) => updateNote.mutate({ id: activeNote.id, ...patch })}
        onDelete={() => {
          deleteNote.mutate(activeNote.id);
          setActiveId(null);
        }}
        onTogglePin={() => updateNote.mutate({ id: activeNote.id, pinned: !activeNote.pinned })}
        onDuplicate={() => duplicateNote.mutate(activeNote)}
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
            onClick={() => {
              if (createNote.isPending) return;
              createNote.mutate();
            }}
            disabled={createNote.isPending}
            aria-label={t("notes.newNote", "New note") as string}
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
                onClick={() => {
                  if (createNote.isPending) return;
                  createNote.mutate();
                }}
                disabled={createNote.isPending}
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
              return (
                <SwipeableNoteRow
                  key={note.id}
                  note={note}
                  dateLocale={dateLocale}
                  lang={lang}
                  onOpen={() => setActiveId(note.id)}
                  onTogglePin={() => updateNote.mutate({ id: note.id, pinned: !note.pinned })}
                  onDelete={() => deleteNote.mutate(note.id)}
                  onShare={async () => {
                    const text = note.content;
                    const firstLine = (text.split("\n").find((l) => l.trim()) || "").slice(0, 80);
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: firstLine || "Notes", text });
                      } else {
                        await navigator.clipboard.writeText(text);
                        toast({ title: t("notes.copied", "Copied to clipboard") as string });
                      }
                    } catch {}
                  }}
                />
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

/* ---------------- Swipeable row ---------------- */

const SwipeableNoteRow = ({
  note,
  dateLocale,
  lang,
  onOpen,
  onTogglePin,
  onDelete,
  onShare,
}: {
  note: NoteRow;
  dateLocale: Locale;
  lang: string;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onShare: () => void;
}) => {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startOffset = useRef(0);
  const moved = useRef(false);
  const axisLock = useRef<"none" | "x" | "y">("none");
  const pointerId = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const LEFT_REVEAL = -160; // reveal share + delete
  const RIGHT_REVEAL = 88; // reveal pin

  const onPointerDown = (e: React.PointerEvent) => {
    // Only react to primary button for mouse / any touch / pen
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = offset;
    moved.current = false;
    axisLock.current = "none";
    pointerId.current = e.pointerId;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axisLock.current === "none") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisLock.current === "x") {
        try {
          containerRef.current?.setPointerCapture(e.pointerId);
        } catch {}
      }
    }
    if (axisLock.current !== "x") return;
    moved.current = true;
    let next = startOffset.current + dx;
    next = Math.max(LEFT_REVEAL - 40, Math.min(RIGHT_REVEAL + 40, next));
    setOffset(next);
  };
  const finish = () => {
    if (axisLock.current === "x") {
      if (offset <= LEFT_REVEAL / 2) setOffset(LEFT_REVEAL);
      else if (offset >= RIGHT_REVEAL / 2) {
        onTogglePin();
        setOffset(0);
      } else setOffset(0);
    }
    startX.current = null;
    startY.current = null;
    axisLock.current = "none";
    if (pointerId.current != null) {
      try {
        containerRef.current?.releasePointerCapture(pointerId.current);
      } catch {}
      pointerId.current = null;
    }
  };

  const handleClick = () => {
    if (moved.current || offset !== 0) {
      setOffset(0);
      return;
    }
    onOpen();
  };

  const lines = note.content.split("\n").filter(Boolean);
  const titleLine = note.title || lines[0] || "";
  const previewLine = (note.title ? lines[0] : lines[1]) ?? "";

  return (
    <li className="relative overflow-hidden">
      {/* Right side actions (revealed on left swipe) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={() => {
            onShare();
            setOffset(0);
          }}
          className="w-20 bg-muted text-foreground text-xs font-medium flex items-center justify-center"
          aria-label={t("notes.share", "Share") as string}
        >
          <Share className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            onDelete();
            setOffset(0);
          }}
          className="w-20 bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center"
          aria-label={t("notes.delete", "Delete note") as string}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {/* Left side action (revealed on right swipe) */}
      <div className="absolute inset-y-0 left-0 flex items-stretch">
        <div
          className="w-[88px] bg-primary/10 text-primary text-xs font-medium flex items-center justify-center"
        >
          <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative bg-background transition-transform duration-200 ease-out touch-pan-y select-none"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onContextMenu={(e) => {
          // On desktop right-click reveals the action set
          if (offset === 0) {
            e.preventDefault();
            setOffset(LEFT_REVEAL);
          }
        }}
      >
        <button onClick={handleClick} className="w-full text-left py-3 px-1">
          <div className="flex items-baseline gap-2">
            {note.pinned && (
              <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0 fill-current self-center" />
            )}
            <span className="text-[15px] font-medium truncate flex-1">
              {titleLine || (
                <span className="text-muted-foreground font-normal">
                  {t("notes.emptyNote", "New note")}
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
      </div>
    </li>
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
  onTogglePin,
  onDuplicate,
}: {
  note: NoteRow;
  dateLocale: Locale;
  lang: string;
  onClose: (finalContent: string) => void;
  onPatch: (patch: Partial<NoteRow>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(note.content);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const rememberSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    };
  };

  useEffect(() => {
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [content]);

  const scheduleContent = (v: string) => {
    setContent(v);
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      if (v !== note.content) onPatch({ content: v });
    }, 400);
  };

  const flush = () => {
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
      if (content !== note.content) onPatch({ content });
    }
  };

  const handleClose = () => {
    flush();
    onClose(content);
  };

  // Replace the current selection with new text and place the caret/selection.
  const replaceRange = (
    start: number,
    end: number,
    newText: string,
    selectAfter?: { start: number; end: number }
  ) => {
    const next = content.slice(0, start) + newText + content.slice(end);
    setContent(next);
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      if (next !== note.content) onPatch({ content: next });
    }, 400);
    const finalSel = selectAfter ?? { start: start + newText.length, end: start + newText.length };
    selectionRef.current = finalSel;
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(finalSel.start, finalSel.end);
    });
  };

  // Wrap selection (or insert tokens at caret) with `token` on both sides.
  const wrap = (token: string) => {
    const { start, end } = selectionRef.current;
    const sel = content.slice(start, end);
    if (sel) {
      const newText = `${token}${sel}${token}`;
      // Keep the inner text selected so user sees formatting applied
      replaceRange(start, end, newText, {
        start: start + token.length,
        end: start + token.length + sel.length,
      });
    } else {
      const newText = `${token}${token}`;
      replaceRange(start, end, newText, {
        start: start + token.length,
        end: start + token.length,
      });
    }
  };

  // Convert each line touched by the selection into a checklist item.
  const insertChecklist = () => {
    const { start, end } = selectionRef.current;
    // Expand to full lines containing the selection
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const nextNl = content.indexOf("\n", end);
    const lineEnd = nextNl === -1 ? content.length : nextNl;
    const block = content.slice(lineStart, lineEnd) || "";
    const lines = block.split("\n");
    const transformed = lines
      .map((l) => (/^\s*-\s\[[ x]\]\s/.test(l) ? l : `- [ ] ${l}`))
      .join("\n");
    replaceRange(lineStart, lineEnd, transformed, {
      start: lineStart,
      end: lineStart + transformed.length,
    });
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${note.user_id}/${note.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      const url = data.publicUrl;
      const { start, end } = selectionRef.current;
      const insert = `${start > 0 && content[start - 1] !== "\n" ? "\n" : ""}![](${url})\n`;
      replaceRange(start, end, insert);
      toast({ title: t("notes.attached", "Attached") as string });
    } catch {
      toast({ title: t("notes.attachFailed", "Couldn't attach") as string, variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleShare = async () => {
    flush();
    const firstLine = (content.split("\n").find((l) => l.trim()) || "").slice(0, 80);
    const shareData = { title: firstLine || (t("notes.title", "Notes") as string), text: content };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(content);
        toast({ title: t("notes.copied", "Copied") as string });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={handleClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-xs text-muted-foreground flex-1 text-center tabular-nums">
            {formatRelative(note.updated_at, dateLocale, lang)}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleShare}>
            <Share className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onTogglePin}>
                <Pin className={cn("h-4 w-4 mr-2", note.pinned && "fill-current")} />
                {note.pinned ? t("notes.unpin", "Unpin") : t("notes.pin", "Pin")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                {t("notes.share", "Share")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                {t("notes.duplicate", "Duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("notes.delete", "Delete note")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            onClick={handleClose}
            aria-label={t("notes.done", "Done") as string}
            className="ml-1 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-transform animate-scale-in"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        <Textarea
          ref={editorRef}
          autoFocus
          value={content}
          onChange={(e) => {
            scheduleContent(e.target.value);
            rememberSelection();
          }}
          onSelect={rememberSelection}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onFocus={rememberSelection}
          onBlur={flush}
          placeholder={t("notes.contentPlaceholder", "Capture your moment…") as string}
          className="min-h-[60vh] text-[15px] leading-relaxed border-0 px-0 focus-visible:ring-0 bg-transparent resize-none placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Floating toolbar */}
      <div
        className="sticky bottom-0 z-10 bg-background/85 backdrop-blur-md border-t border-border/40 pb-safe"
        // Prevent the toolbar from stealing focus / selection from the textarea
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          // Allow buttons to receive click but never blur the textarea
          if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
        }}
      >
        <div className="max-w-2xl mx-auto px-2 py-2 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => wrap("**")} aria-label="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => wrap("_")} aria-label="Italic">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={insertChecklist} aria-label="Checklist">
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAttach}
          />
        </div>
      </div>
    </div>
  );
};

export default Notes;
