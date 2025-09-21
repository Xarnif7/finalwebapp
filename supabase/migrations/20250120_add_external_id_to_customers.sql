-- Add external_id column to customers table if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add index for external_id for better performance
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(external_id);

-- Add comment to document the column
COMMENT ON COLUMN customers.external_id IS 'External system identifier (e.g., CRM ID, Zapier external_id)';
