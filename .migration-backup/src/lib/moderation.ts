import { supabase } from "@/integrations/supabase/client";

interface ModerationResult {
  approved: boolean;
  reason?: string;
  strikes?: number;
  maxStrikes?: number;
  message?: string;
}

export async function moderateContent({
  text,
  imageUrl,
  userId,
  contentType,
}: {
  text?: string;
  imageUrl?: string;
  userId: string;
  contentType: string;
}): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: { text, imageUrl, userId, contentType },
    });

    if (error) {
      console.error("Moderation invoke error:", error);
      // Fail open
      return { approved: true };
    }

    return data as ModerationResult;
  } catch (err) {
    console.error("Moderation error:", err);
    return { approved: true };
  }
}
