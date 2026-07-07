---
name: Gemini via Replit proxy quirks
description: Non-obvious behaviors of gemini-2.5-flash through the Replit Gemini integration that caused empty responses.
---

# Gemini (Replit proxy) quirks

- **Rule:** With `gemini-2.5-flash`, always set `thinkingConfig: { thinkingBudget: 0 }` (or a large `maxOutputTokens`) for short structured outputs.
- **Why:** The model spends "thinking" tokens against `maxOutputTokens`; with small limits the visible text comes back empty (`response.text === ""`) with no error.
- **How to apply:** Any `generateContent`/`generateContentStream` call expecting compact JSON or short text — set thinkingBudget 0 and generous maxOutputTokens.
