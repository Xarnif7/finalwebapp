-- Add safety columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dnc BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hard_bounced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_review_request_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_unsubscribed ON customers (unsubscribed);
CREATE INDEX IF NOT EXISTS idx_customers_dnc ON customers (dnc);
CREATE INDEX IF NOT EXISTS idx_customers_hard_bounced ON customers (hard_bounced);
CREATE INDEX IF NOT EXISTS idx_customers_last_review_request ON customers (last_review_request_at);

-- Add cooldown period environment variable support
-- This will be handled in the application code using COOLDOWN_DAYS env var
