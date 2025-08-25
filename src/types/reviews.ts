export interface Review {
  id: string;
  business_id: string;
  platform: 'google' | 'facebook' | 'yelp';
  external_review_id: string;
  reviewer_name?: string;
  rating: number;
  text?: string;
  review_url?: string;
  review_created_at: string;
  reply_text?: string;
  reply_posted_at?: string;
  is_replied: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  created_at: string;
  updated_at: string;
}

export interface ReviewReply {
  id: string;
  review_id: string;
  reply_text: string;
  replied_at: string;
  channel: 'manual' | 'email' | 'sms' | 'both';
  responder_id: string;
  created_at: string;
}

export interface ReviewRequest {
  id: string;
  business_id: string;
  customer_id: string;
  channel: 'email' | 'sms' | 'both';
  email_status: 'queued' | 'sent' | 'failed' | 'skipped';
  sms_status: 'queued' | 'sent' | 'failed' | 'skipped';
  requested_at: string;
  review_link: string;
  created_at: string;
}

export interface Template {
  id: string;
  business_id: string;
  kind: 'email' | 'sms';
  subject?: string;
  body: string;
  updated_at: string;
  created_at: string;
}

export interface ReviewStats {
  avgRating: number;
  totalReviews: number;
  avgResponseTimeHours: number;
  replyRatePct: number;
  platformBreakdown: {
    platform: string;
    count: number;
    avgRating: number;
  }[];
  ratingTrends?: {
    weekStart: string;
    avgRating: number;
    count: number;
  }[];
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewSource {
  id: string;
  business_id: string;
  platform: 'google' | 'facebook' | 'yelp';
  public_url?: string;
  external_id?: string;
  connection_type?: string;
  access_token?: string;
  refresh_token?: string;
  connected: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}
