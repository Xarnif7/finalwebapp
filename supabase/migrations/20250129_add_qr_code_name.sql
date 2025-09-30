-- Add name column to qr_codes table
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Add comment to explain the column
COMMENT ON COLUMN qr_codes.name IS 'User-defined name for the QR code (e.g., Front Office, Back Office)';
