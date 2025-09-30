-- QR Code functionality setup
-- This migration creates the necessary tables and functions for QR code generation

-- Create sequence for QR code generation
CREATE SEQUENCE IF NOT EXISTS qr_code_seq START 1;

-- Create qr_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tech_id UUID REFERENCES techs(id) ON DELETE SET NULL,
    name VARCHAR(100),
    code TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    scans_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create techs table if it doesn't exist (for technician attribution)
CREATE TABLE IF NOT EXISTS techs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the generate_qr_code function
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'QR' || LPAD(nextval('qr_code_seq')::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for qr_codes table
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see QR codes for their business
CREATE POLICY "Users can view QR codes for their business" ON qr_codes
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert QR codes for their business
CREATE POLICY "Users can create QR codes for their business" ON qr_codes
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can update QR codes for their business
CREATE POLICY "Users can update QR codes for their business" ON qr_codes
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete QR codes for their business
CREATE POLICY "Users can delete QR codes for their business" ON qr_codes
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Create RLS policies for techs table
ALTER TABLE techs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see techs for their business
CREATE POLICY "Users can view techs for their business" ON techs
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert techs for their business
CREATE POLICY "Users can create techs for their business" ON techs
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can update techs for their business
CREATE POLICY "Users can update techs for their business" ON techs
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete techs for their business
CREATE POLICY "Users can delete techs for their business" ON techs
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_id ON qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_techs_business_id ON techs(business_id);

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE qr_code_seq TO authenticated;
GRANT ALL ON qr_codes TO authenticated;
GRANT ALL ON techs TO authenticated;
