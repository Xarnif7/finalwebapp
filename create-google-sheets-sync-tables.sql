-- Create Google Sheets sync settings table
CREATE TABLE IF NOT EXISTS public.google_sheets_sync_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  auto_sync_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, spreadsheet_id)
);

-- Create Google Sheets sync logs table
CREATE TABLE IF NOT EXISTS public.google_sheets_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  customers_inserted INTEGER DEFAULT 0,
  customers_updated INTEGER DEFAULT 0,
  sync_type TEXT NOT NULL, -- 'manual' or 'auto'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_settings_business_id ON public.google_sheets_sync_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_settings_spreadsheet_id ON public.google_sheets_sync_settings(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_logs_business_id ON public.google_sheets_sync_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_logs_created_at ON public.google_sheets_sync_logs(created_at);

-- Enable RLS
ALTER TABLE public.google_sheets_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheets_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_sheets_sync_settings
DROP POLICY IF EXISTS "Users can view their own Google Sheets sync settings" ON public.google_sheets_sync_settings;
CREATE POLICY "Users can view their own Google Sheets sync settings" ON public.google_sheets_sync_settings
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own Google Sheets sync settings" ON public.google_sheets_sync_settings;
CREATE POLICY "Users can insert their own Google Sheets sync settings" ON public.google_sheets_sync_settings
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can update their own Google Sheets sync settings" ON public.google_sheets_sync_settings;
CREATE POLICY "Users can update their own Google Sheets sync settings" ON public.google_sheets_sync_settings
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own Google Sheets sync settings" ON public.google_sheets_sync_settings;
CREATE POLICY "Users can delete their own Google Sheets sync settings" ON public.google_sheets_sync_settings
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

-- RLS Policies for google_sheets_sync_logs
DROP POLICY IF EXISTS "Users can view their own Google Sheets sync logs" ON public.google_sheets_sync_logs;
CREATE POLICY "Users can view their own Google Sheets sync logs" ON public.google_sheets_sync_logs
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own Google Sheets sync logs" ON public.google_sheets_sync_logs;
CREATE POLICY "Users can insert their own Google Sheets sync logs" ON public.google_sheets_sync_logs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE created_by = auth.jwt() ->> 'email'
    )
  );
