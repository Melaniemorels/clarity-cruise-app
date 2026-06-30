
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'quick',
  title text,
  content text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  linked_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notes_kind_check CHECK (kind IN ('quick','core'))
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own notes"
ON public.notes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
ON public.notes FOR DELETE
USING (user_id = auth.uid());

CREATE INDEX idx_notes_user_kind ON public.notes(user_id, kind);
CREATE INDEX idx_notes_user_linked_date ON public.notes(user_id, linked_date);

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
