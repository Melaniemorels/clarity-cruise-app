-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  caption text,
  activity_tag text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT caption_length CHECK (length(caption) <= 140)
);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts
CREATE POLICY "Posts are viewable by everyone"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (auth.uid() = user_id);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Enable RLS on post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_likes
CREATE POLICY "Post likes are viewable by everyone"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.post_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;