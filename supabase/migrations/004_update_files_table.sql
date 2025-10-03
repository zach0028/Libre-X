-- =====================================================
-- UPDATE FILES TABLE - Add missing columns
-- Libre-X Supabase Migration
-- =====================================================

-- Add missing columns to files table
ALTER TABLE public.files 
  ADD COLUMN IF NOT EXISTS file_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bytes BIGINT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on file_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_file_id ON public.files(file_id);

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS files_updated_at ON public.files;
CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Update existing rows to have file_id if missing
UPDATE public.files
SET file_id = id::text
WHERE file_id IS NULL;

-- =====================================================
-- UPDATE TRANSACTIONS TABLE - Add missing columns
-- =====================================================

-- Rename 'type' to 'transaction_type' to avoid conflicts
ALTER TABLE public.transactions 
  RENAME COLUMN type TO transaction_type;

-- Add missing columns
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS token_type TEXT,
  ADD COLUMN IF NOT EXISTS raw_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS token_value NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS rate NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS context TEXT;

-- Update check constraint to use new column name
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IN ('credit', 'debit', 'refund', 'purchase'));

-- =====================================================
-- UPDATE PROFILES TABLE - Add token_balance
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS token_balance NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_refill TIMESTAMPTZ;

-- =====================================================
-- UPDATE SCORING_TEMPLATES TABLE - Add missing columns
-- =====================================================

ALTER TABLE public.scoring_templates
  ADD COLUMN IF NOT EXISTS preset_id TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "order" INTEGER,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on preset_id for backward compatibility
CREATE INDEX IF NOT EXISTS idx_scoring_templates_preset_id 
  ON public.scoring_templates(preset_id);

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_scoring_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scoring_templates_updated_at ON public.scoring_templates;
CREATE TRIGGER scoring_templates_updated_at
  BEFORE UPDATE ON public.scoring_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_scoring_templates_updated_at();

-- =====================================================
-- RLS POLICIES FOR FILES
-- =====================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_update_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;

-- Users can view their own files
CREATE POLICY "files_select_own"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

-- Users can upload files
CREATE POLICY "files_insert_own"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "files_update_own"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "files_delete_own"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES FOR TRANSACTIONS
-- =====================================================

DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;

-- Users can view their own transactions
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert transactions (backend only)
-- No INSERT policy for regular users

-- =====================================================
-- CLEANUP: Remove expired files periodically
-- =====================================================

-- Function to delete expired files
CREATE OR REPLACE FUNCTION delete_expired_files()
RETURNS void AS $$
BEGIN
  DELETE FROM public.files
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You can set up a cron job in Supabase to call this function
-- Example: SELECT cron.schedule('delete-expired-files', '0 * * * *', 'SELECT delete_expired_files();');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_expires_at 
  ON public.files(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_storage_provider 
  ON public.files(storage_provider);

-- Transactions table indexes  
CREATE INDEX IF NOT EXISTS idx_transactions_token_type 
  ON public.transactions(token_type);

CREATE INDEX IF NOT EXISTS idx_transactions_model 
  ON public.transactions(model);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_token_balance 
  ON public.profiles(token_balance);

COMMENT ON TABLE public.files IS 'User uploaded files with TTL support';
COMMENT ON TABLE public.transactions IS 'Token usage and credit transactions';
COMMENT ON TABLE public.scoring_templates IS 'AI model scoring templates (formerly presets)';
COMMENT ON COLUMN public.files.file_id IS 'Unique file identifier for external reference';
COMMENT ON COLUMN public.profiles.token_balance IS 'User token credit balance';


