import { useState } from "react";
import { Pencil, Trash2, Check, X, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAIMemories,
  useUpdateAIMemory,
  useDeleteAIMemory,
  useClearAIMemories,
  type AIMemory,
} from "@/hooks/use-ai-memories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TYPE_LABEL: Record<string, string> = {
  preference: "Preference",
  goal: "Goal",
  routine: "Routine",
  relationship: "Relationship",
  health: "Health",
  work: "Work",
  calendar: "Calendar",
  interest: "Interest",
  other: "Other",
};

function MemoryRow({ memory }: { memory: AIMemory }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const update = useUpdateAIMemory();
  const remove = useDeleteAIMemory();

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
            {TYPE_LABEL[memory.memory_type] || memory.memory_type}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            · {memory.importance_score}/10
          </span>
        </div>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className={cn(
              "w-full resize-none bg-secondary/40 rounded-lg px-2.5 py-1.5",
              "text-[13px] text-foreground outline-none border border-border/40"
            )}
          />
        ) : (
          <p className="text-[13px] leading-snug text-foreground/85">{memory.content}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <button
              onClick={async () => {
                if (draft.trim() && draft !== memory.content) {
                  await update.mutateAsync({ id: memory.id, content: draft.trim() });
                }
                setEditing(false);
              }}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-secondary"
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setDraft(memory.content);
                setEditing(false);
              }}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-secondary"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => remove.mutate(memory.id)}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function AIMemoryManager() {
  const { data: memories, isLoading } = useAIMemories();
  const clearAll = useClearAIMemories();

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-card/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          <span>
            {isLoading
              ? "Loading…"
              : `${memories?.length || 0} saved ${
                  (memories?.length || 0) === 1 ? "memory" : "memories"
                }`}
          </span>
        </div>
        {!!memories?.length && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-[11px] text-destructive hover:underline">
                Clear all
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
                <AlertDialogDescription>
                  VYV Guide will forget everything it has learned about you. This can't be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearAll.mutate()}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {!isLoading && !memories?.length && (
        <div className="flex items-center gap-2 py-3 text-[12px] text-muted-foreground/80">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Nothing remembered yet. As you chat, VYV will quietly remember what matters.</span>
        </div>
      )}

      <div>
        {memories?.map((m) => (
          <MemoryRow key={m.id} memory={m} />
        ))}
      </div>
    </div>
  );
}