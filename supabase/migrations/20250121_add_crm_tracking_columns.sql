-- Add CRM integration tracking columns to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS crm_integration_active BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS crm_integration_connected_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_crm_integration_active ON businesses(crm_integration_active);

-- Update existing businesses to have CRM integration as active if they have customers
UPDATE businesses 
SET crm_integration_active = TRUE, 
    crm_integration_connected_at = NOW()
WHERE id IN (
  SELECT DISTINCT business_id 
  FROM customers 
  WHERE business_id IS NOT NULL
);
