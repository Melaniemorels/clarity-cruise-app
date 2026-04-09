import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "I feel unmotivated",
  "I don't know what to do",
  "I'm stuck",
  "I need to move",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vyv-assistant`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VYVAssistantSheet({ open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userMsg: Msg = { role: "user", content: text.trim() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      let assistantSoFar = "";
      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || "Something went wrong");
        }

        if (!resp.body) throw new Error("No response");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantSoFar += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, content: assistantSoFar }
                        : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantSoFar }];
                });
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      } catch (e: any) {
        toast({
          title: "VYV Guide",
          description: e.message || "Could not connect",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* sheet */}
      <div
        className={cn(
          "relative mt-auto w-full max-w-lg mx-auto",
          "bg-card border border-border/50 rounded-t-2xl",
          "shadow-xl flex flex-col",
          "animate-in slide-in-from-bottom duration-300",
          "max-h-[75vh]"
        )}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            VYV Guide
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[260px]">
                A quiet space for clarity. What's on your mind?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs",
                      "border border-border/60 bg-secondary/40",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-secondary/70 transition-colors"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "text-sm leading-relaxed max-w-[85%]",
                m.role === "user"
                  ? "ml-auto text-right text-foreground"
                  : "mr-auto text-muted-foreground"
              )}
            >
              {m.role === "user" ? (
                <span className="inline-block bg-primary/10 rounded-2xl px-3.5 py-2 text-left text-foreground">
                  {m.content}
                </span>
              ) : (
                <span className="inline-block">{m.content}</span>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-1 items-center text-muted-foreground/50">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* input */}
        <div className="px-4 pb-4 pt-2 border-t border-border/30">
          <div className="flex items-end gap-2 bg-secondary/30 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm",
                "text-foreground placeholder:text-muted-foreground/50",
                "outline-none max-h-24"
              )}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-full shrink-0",
                "bg-primary text-primary-foreground",
                "disabled:opacity-30 transition-opacity"
              )}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
