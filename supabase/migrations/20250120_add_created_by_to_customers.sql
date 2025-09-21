-- Add created_by column to customers table if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing customers to have a default created_by value
-- Use the business owner's user_id as the created_by for existing customers
UPDATE customers 
SET created_by = (
    SELECT b.created_by 
    FROM businesses b 
    WHERE b.id = customers.business_id 
    LIMIT 1
)
WHERE created_by IS NULL;

-- Make created_by NOT NULL after backfilling
ALTER TABLE customers ALTER COLUMN created_by SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- Add comment to document the column
COMMENT ON COLUMN customers.created_by IS 'User who created this customer record';
