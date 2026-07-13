// Ingestion-time AI classification for explore_items.
//
// The keyword rules in healthy.ts (plus provider metadata) give every candidate
// an initial category + language. This module refines BOTH fields with Gemini
// in a single batched structured-output call, right before insertion.
//
// Hard guarantees:
// - Never invents items: it only relabels the candidates it is given.
// - Best-effort: any AI failure (network, quota, bad JSON) keeps the
//   rules-based values, so ingestion never breaks because of the model.
// - Only accepts categories from the healthy taxonomy and languages es|en;
//   anything else from the model is ignored per-field.

import { ai } from "@workspace/integrations-gemini-ai";
import { HEALTHY_CATEGORIES, HEALTHY_CATEGORY_SET } from "./healthy";

export interface ClassifiableCandidate {
  title: string;
  creator: string | null;
  category: string;
  language: string | null;
}

const MAX_BATCH = 40;

export async function refineCandidatesWithAI<T extends ClassifiableCandidate>(
  candidates: T[],
): Promise<T[]> {
  if (candidates.length === 0) return candidates;
  const out = [...candidates];
  for (let start = 0; start < out.length; start += MAX_BATCH) {
    const batch = out.slice(start, start + MAX_BATCH);
    try {
      const refined = await classifyBatch(batch);
      for (let i = 0; i < batch.length; i++) {
        const r = refined.get(i);
        if (!r) continue;
        const item = out[start + i];
        if (r.category && HEALTHY_CATEGORY_SET.has(r.category)) {
          item.category = r.category;
        }
        if (r.language === "es" || r.language === "en") {
          item.language = r.language;
        }
      }
    } catch {
      // Keep rules-based values for this batch.
    }
  }
  return out;
}

async function classifyBatch(
  batch: ClassifiableCandidate[],
): Promise<Map<number, { category?: string; language?: string }>> {
  const list = batch
    .map(
      (c, i) =>
        `${i}. title: ${JSON.stringify(c.title)}, creator: ${JSON.stringify(
          c.creator ?? "",
        )}, current_category: ${c.category}, current_language: ${
          c.language ?? "unknown"
        }`,
    )
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are classifying wellness content items for a catalogue.

Allowed categories (choose exactly one per item):
${HEALTHY_CATEGORIES.join(", ")}

Allowed languages: "es" (Spanish), "en" (English).

Items:
${list}

For EACH item, decide the best category from the allowed list and the language of the content (from its title/creator). If the current value already looks correct, repeat it. If you cannot tell the language, use the current one.

Reply with ONLY a JSON array covering every item, no prose:
[{"i":0,"category":"...","language":"es|en"}]`,
          },
        ],
      },
    ],
    config: {
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  });

  const raw = (response.text ?? "").trim();
  const result = new Map<number, { category?: string; language?: string }>();
  if (!raw) return result;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return result;
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const i = (entry as any).i;
    if (typeof i !== "number" || i < 0 || i >= batch.length) continue;
    result.set(i, {
      category:
        typeof (entry as any).category === "string"
          ? (entry as any).category
          : undefined,
      language:
        typeof (entry as any).language === "string"
          ? (entry as any).language
          : undefined,
    });
  }
  return result;
}
