/**
 * Explorer design tokens — single source of truth for typography, spacing
 * and sizing across every Explorer surface (carousels, grids, section pages).
 * Built on top of the existing Tailwind theme (dark, old-money palette).
 */

export const explorerText = {
  /** Page title (Explore / section pages) */
  pageTitle: "font-bold tracking-tight text-foreground",
  /** Section heading inside the Explorer */
  sectionTitle: "font-bold tracking-tight text-foreground",
  /** Small subtitle under a section heading */
  sectionSubtitle: "text-xs text-muted-foreground",
  /** Card title — always clamped to 2 lines */
  cardTitle:
    "font-semibold text-foreground leading-snug line-clamp-2 whitespace-normal",
  /** Card description — always clamped to 2 lines */
  cardDescription:
    "text-[11px] text-muted-foreground leading-snug line-clamp-2 whitespace-normal",
  /** Metadata (duration, counts) */
  cardMeta: "text-[11px] text-muted-foreground",
  /** Source / provider chip */
  sourceChip:
    "text-[10px] font-medium tracking-wide bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5",
  /** "Curated by VYV" chip */
  curatedChip:
    "text-[10px] font-medium tracking-wide bg-primary/15 text-primary rounded px-1.5 py-0.5",
  /** Inline text action (Open, Continue…) */
  textAction:
    "flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors",
} as const;

export const explorerCard = {
  /** Shared card shell */
  shell:
    "group rounded-2xl overflow-hidden cursor-pointer bg-card border border-border/30 transition-all duration-300 hover:border-border/60 hover:shadow-lg",
  /** Fixed carousel widths per device */
  carouselWidth: {
    mobile: "w-[180px]",
    tablet: "w-[220px]",
    desktop: "w-[260px]",
  },
  /** Artwork heights per device */
  artworkHeight: {
    mobile: "h-[120px]",
    desktop: "h-[140px]",
  },
  /** Card body padding */
  body: "p-3 space-y-1.5",
} as const;

/** Section title size per device (keeps headings uniform) */
export function sectionTitleSize(isMobile: boolean): string {
  return isMobile ? "text-lg" : "text-xl";
}

/** Page title size per device */
export function pageTitleSize(isMobile: boolean): string {
  return isMobile ? "text-2xl" : "text-3xl";
}
