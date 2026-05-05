import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { es, enUS, type Locale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pin, PinOff, Plus, Trash2, ChevronDown, ChevronUp, ArrowUpRight, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const quickNotes = useMemo(
    () => notes.filter((n) => n.kind === "quick" && n.linked_date === dateStr),
    [notes, dateStr]
  );
  const coreNotes = useMemo(() => notes.filter((n) => n.kind === "core"), [notes]);

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

  // Quick note draft
  const [draft, setDraft] = useState("");
  const handleQuickAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await createNote.mutateAsync({ kind: "quick", content: text, linked_date: dateStr });
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="quick" className="w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("notes.title", "Notes")}
          </h2>
          <TabsList className="h-8">
            <TabsTrigger value="quick" className="text-xs px-2 py-1">
              {t("notes.quick", "Quick")}
            </TabsTrigger>
            <TabsTrigger value="core" className="text-xs px-2 py-1">
              {t("notes.core", "Notes")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="quick" className="space-y-2 mt-2">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              placeholder={t("notes.quickPlaceholder", "Quick thought…")}
              className="h-9 text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleQuickAdd}
              disabled={!draft.trim()}
              className="h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {quickNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {t("notes.emptyQuick", "No notes for this day yet.")}
              </p>
            ) : (
              quickNotes.map((note) => (
                <QuickNoteItem
                  key={note.id}
                  note={note}
                  dateLocale={dateLocale}
                  onSave={(content) => updateNote.mutate({ id: note.id, content })}
                  onDelete={() => deleteNote.mutate(note.id)}
                  onConvert={async () => {
                    await updateNote.mutateAsync({ id: note.id, kind: "core" });
                    toast.success(t("notes.converted", "Converted to note"));
                  }}
                  onTogglePin={() => updateNote.mutate({ id: note.id, pinned: !note.pinned })}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="core" className="space-y-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground h-8 px-2"
            onClick={() =>
              createNote.mutate({ kind: "core", title: "", content: "", items: [] })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("notes.newNote", "New note")}
          </Button>

          <div className="space-y-1">
            {coreNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {t("notes.emptyCore", "No notes yet.")}
              </p>
            ) : (
              [...coreNotes]
                .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                .map((note) => (
                  <CoreNoteItem
                    key={note.id}
                    note={note}
                    currentDateStr={dateStr}
                    dateLocale={dateLocale}
                    onPatch={(patch) => updateNote.mutate({ id: note.id, ...patch })}
                    onDelete={() => deleteNote.mutate(note.id)}
                  />
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ---------------- Quick Note ---------------- */

const QuickNoteItem = ({
  note,
  dateLocale,
  onSave,
  onDelete,
  onConvert,
  onTogglePin,
}: {
  note: NoteRow;
  dateLocale: Locale;
  onSave: (content: string) => void;
  onDelete: () => void;
  onConvert: () => void;
  onTogglePin: () => void;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(note.content);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValue(note.content), [note.content]);

  const scheduleSave = (next: string) => {
    setValue(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (next !== note.content) onSave(next);
    }, 600);
  };

  return (
    <div className="group rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
      {expanded ? (
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => scheduleSave(e.target.value)}
          onBlur={() => {
            if (value !== note.content) onSave(value);
          }}
          className="min-h-[80px] text-sm border-0 p-1 focus-visible:ring-0 bg-transparent resize-none"
        />
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-left w-full text-sm line-clamp-2 text-foreground"
        >
          {note.content || (
            <span className="text-muted-foreground italic">
              {t("notes.emptyNote", "Empty note")}
            </span>
          )}
        </button>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(note.updated_at), "HH:mm", { locale: dateLocale })}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTogglePin}>
            {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onConvert} title={t("notes.convertToNote", "Convert to note") as string}>
            <ArrowUpRight className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Core Note ---------------- */

const CoreNoteItem = ({
  note,
  currentDateStr,
  dateLocale,
  onPatch,
  onDelete,
}: {
  note: NoteRow;
  currentDateStr: string;
  dateLocale: Locale;
  onPatch: (patch: Partial<NoteRow>) => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  const [items, setItems] = useState(note.items ?? []);
  const [showChecklist, setShowChecklist] = useState((note.items ?? []).length > 0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note.title ?? "");
    setContent(note.content);
    setItems(note.items ?? []);
  }, [note.id]);

  const scheduleSave = (patch: Partial<NoteRow>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onPatch(patch), 600);
  };

  const preview = title || content.split("\n")[0] || (items[0]?.text ?? t("notes.emptyNote", "Empty note"));
  const isLinkedToToday = note.linked_date === currentDateStr;

  return (
    <div className="rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
      {!expanded ? (
        <button onClick={() => setExpanded(true)} className="text-left w-full">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            <span className="text-sm truncate flex-1">{preview}</span>
            {note.linked_date && (
              <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            placeholder={t("notes.titlePlaceholder", "Title (optional)") as string}
            className="h-8 text-sm border-0 p-1 focus-visible:ring-0 bg-transparent font-medium"
          />
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave({ content: e.target.value });
            }}
            placeholder={t("notes.contentPlaceholder", "Write something…") as string}
            className="min-h-[80px] text-sm border-0 p-1 focus-visible:ring-0 bg-transparent resize-none"
          />

          {showChecklist && (
            <div className="space-y-1">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Checkbox
                    checked={it.done}
                    onCheckedChange={(v) => {
                      const next = [...items];
                      next[idx] = { ...it, done: !!v };
                      setItems(next);
                      onPatch({ items: next });
                    }}
                  />
                  <Input
                    value={it.text}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...it, text: e.target.value };
                      setItems(next);
                      scheduleSave({ items: next });
                    }}
                    className={cn(
                      "h-7 text-sm border-0 p-1 focus-visible:ring-0 bg-transparent flex-1",
                      it.done && "line-through text-muted-foreground"
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const next = items.filter((_, i) => i !== idx);
                      setItems(next);
                      onPatch({ items: next });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  const next = [...items, { text: "", done: false }];
                  setItems(next);
                  onPatch({ items: next });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("notes.addItem", "Add item")}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onPatch({ pinned: !note.pinned })}
                title={t("notes.pin", "Pin") as string}
              >
                {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  onPatch({ linked_date: isLinkedToToday ? null : currentDateStr })
                }
                title={t("notes.linkToDay", "Link to this day") as string}
              >
                <Link2 className={cn("h-3 w-3", isLinkedToToday && "text-primary")} />
              </Button>
              {!showChecklist && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setShowChecklist(true)}
                >
                  {t("notes.addChecklist", "Add list")}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground mr-1">
                {format(new Date(note.updated_at), "HH:mm", { locale: dateLocale })}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(false)}>
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};