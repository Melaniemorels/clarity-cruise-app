## Goal
Give VYV Guide opt-in, read-first access to the user's calendar so it can summarize the day, suggest better time blocks, and create/edit/move events — but only after explicit confirmation per action.

## Scope of this change
- Use the **internal VYV calendar** (existing `calendar_events` table) as the source of truth. It already powers `/calendar`, supports external Google/iCal sync, and respects RLS per user.
- No new OAuth flow. Google/Apple Calendar sync already exists via the external calendar sync architecture; we reuse it. Two-way write-back to Google/Apple is out of scope for this iteration (we write to the internal calendar; existing sync mirrors as configured).
- All AI calendar capability is gated by a new per-user permission flag.

## UX

### 1. Permission gate
- New row in user settings: **"Let VYV Guide access my calendar"** (off by default).
- First time the user asks the assistant something calendar-related, show an inline consent card inside the assistant sheet:
  - "VYV Guide can read your calendar to help plan your day. It will always ask before adding or changing anything."
  - Buttons: **Allow** / **Not now**.
- A persistent "Disconnect calendar from VYV Guide" control lives in Settings → Privacy.

### 2. Assistant capabilities (when permission granted)
Inside `VYVAssistantSheet`, the assistant can:
- **Summarize today / tomorrow** — read-only.
- **Suggest a plan** — propose blocks for focus, rest, gym, errands, social, wellness based on existing events + free slots.
- **Detect overload** — flag days with too many back-to-back commitments and suggest what to shorten / move.
- **Propose create / move / delete** — never executed silently. Always rendered as a **proposal card** inside the chat:
  - Shows: title, date/time, duration, category, "Confirm" / "Cancel" buttons.
  - Only on Confirm does the write happen.

### 3. Confirmation rules
- Every write (create, update, move, delete) requires an explicit tap on the proposal card.
- Bulk suggestions become a list of individual proposal cards — user confirms each.
- No "auto-apply".

### 4. Audit
- Every AI-driven write is logged with: action, event id, before/after snapshot, timestamp.
- Visible in Settings → Privacy → "AI calendar activity" (last 50 entries).

## Technical plan

### Database (one migration)
1. `profiles.ai_calendar_access_enabled boolean default false` (or new `ai_permissions` table if cleaner — single column is fine here).
2. New table `ai_calendar_audit`:
   - `user_id`, `action` (create|update|delete), `event_id`, `before jsonb`, `after jsonb`, `prompt text`, `created_at`.
   - RLS: user can select their own rows; only service role inserts.
   - GRANTs: SELECT to authenticated, ALL to service_role.

### Edge function: `vyv-assistant` (update existing)
- Accept `messages` + `calendarAccess: boolean` from client.
- When `calendarAccess === true`, validate the user's JWT, then fetch upcoming events (today + next 7 days) from `calendar_events` using the service role scoped by `auth.uid()`.
- Inject a compact JSON calendar snapshot into the system context.
- Extend system prompt with calendar rules:
  - Never claim to have changed anything.
  - When the user asks to add/move/delete, respond with a **structured proposal** in a fenced block:
    ```vyv-proposal
    {"action":"create","title":"Gym","starts_at":"2026-06-07T19:00:00Z","ends_at":"2026-06-07T20:00:00Z","category":"sport"}
    ```
  - Plus a one-line natural confirmation question ("Add Gym tomorrow 7–8 PM?").
- Use Lovable AI (`google/gemini-2.5-flash`) — no new keys.

### Edge function: `vyv-calendar-action` (new)
- Auth required (JWT).
- Body: `{ action, payload }` validated with zod.
- Re-checks `ai_calendar_access_enabled` server-side before executing.
- Performs the insert/update/delete on `calendar_events` for `auth.uid()` only.
- Writes a row to `ai_calendar_audit`.
- Returns the resulting event.

### Frontend
- `src/components/VYVAssistantSheet.tsx`
  - Read permission flag from profile.
  - Show consent card when missing and user sends a calendar-intent message (simple keyword sniff + assistant can re-prompt).
  - Parse assistant responses for ```vyv-proposal``` blocks and render a `<CalendarProposalCard>` inline with Confirm / Cancel.
  - On Confirm → call `vyv-calendar-action` → toast + show success state on card.
- `src/components/CalendarProposalCard.tsx` (new) — minimal, VYV aesthetic.
- Settings → Privacy section: toggle + "Disconnect" + recent audit list (`useQuery` from `ai_calendar_audit`).
- i18n strings added to `en.json` / `es.json`.

### Privacy / safety
- Server-side permission re-check on every write — client flag is never trusted.
- Audit log is append-only for the user.
- Disconnect immediately stops the edge function from including calendar context (read happens server-side and is gated by the same flag).
- Minimum data: only fields needed (title, starts_at, ends_at, category, id). No notes, no attendees.

## Out of scope (call out)
- Writing back to Google/Apple from AI actions (relies on existing sync direction).
- Cross-user calendar coordination via AI (covered by existing Social Plans flow).
- Voice input.

## Deliverables
- 1 migration
- Updated `supabase/functions/vyv-assistant/index.ts`
- New `supabase/functions/vyv-calendar-action/index.ts`
- Updated `VYVAssistantSheet.tsx` + new `CalendarProposalCard.tsx`
- Settings privacy controls + audit view
- i18n updates
