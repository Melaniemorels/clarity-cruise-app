import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VYVAssistantSheet } from "./VYVAssistantSheet";

export function VYVAssistantButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="VYV Guide"
        className={cn(
          "fixed z-40 flex items-center justify-center",
          "h-11 w-11 rounded-full",
          "bg-card/80 backdrop-blur-md border border-border/50",
          "shadow-sm hover:shadow-md",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4",
          // landscape: offset for side rail
          "landscape:bottom-4 landscape:right-4"
        )}
      >
        <Sparkles
          className="h-[18px] w-[18px] text-muted-foreground/70"
          strokeWidth={1.5}
        />
      </button>

      <VYVAssistantSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
