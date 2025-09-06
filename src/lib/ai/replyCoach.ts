export type ReplyCoachRequest = {
  reviewId: string;
  tone?: 'professional' | 'friendly' | 'grateful' | 'brief';
};

export type ReplyCoachResponse = {
  suggestions: {
    option1: string;
    option2: string;
    tone: string;
    word_count: [number, number];
  };
  fallback?: boolean;
};

export async function generateReplyDrafts({ reviewId, tone = 'professional' }: ReplyCoachRequest): Promise<ReplyCoachResponse> {
  const res = await fetch('/api/ai/reply-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_id: reviewId, tone }),
  });
  if (!res.ok) {
    throw new Error('Failed to generate drafts');
  }
  return res.json();
}


