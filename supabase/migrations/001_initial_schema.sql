-- =====================================================
-- LIBRE-X SUPABASE MIGRATION
-- Initial Schema Creation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- User info
  name TEXT,
  username TEXT UNIQUE,
  avatar TEXT,

  -- Role & Permissions
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'pro', 'team', 'enterprise')),

  -- Subscription
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'team', 'enterprise')),
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,

  -- Usage tracking
  comparisons_count INTEGER DEFAULT 0,
  comparisons_this_month INTEGER DEFAULT 0,
  last_comparison_reset TIMESTAMPTZ DEFAULT NOW(),
  tokens_compared BIGINT DEFAULT 0,

  -- Preferences (JSON)
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "language": "en",
    "comparison": {
      "defaultModels": ["gpt-4", "claude-3-opus"],
      "autoScore": false,
      "defaultCategory": "general"
    }
  }'::jsonb,

  -- 2FA (migrated from MongoDB)
  two_factor_enabled BOOLEAN DEFAULT false,

  -- Terms acceptance
  terms_accepted BOOLEAN DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_subscription ON public.profiles(subscription_plan);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- =====================================================
-- COMPARISON SESSIONS TABLE (replaces conversations)
-- =====================================================
CREATE TABLE public.comparison_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Session title
  title TEXT,

  -- Prompt details
  prompt JSONB NOT NULL, -- { text, systemPrompt, temperature, maxTokens }

  -- Models compared
  models TEXT[] NOT NULL, -- ["gpt-4", "claude-3-opus", "gemini-pro"]

  -- Responses (embedded as JSONB array)
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each response: { responseId, model, endpoint, text, performance, tokenCount, cost, scoring, feedback }

  -- Winner determination
  winner JSONB, -- { model, reason, score }

  -- Metadata
  metadata JSONB DEFAULT '{
    "category": "general",
    "tags": [],
    "isPublic": false,
    "viewCount": 0
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comparison_user ON public.comparison_sessions(user_id);
CREATE INDEX idx_comparison_created ON public.comparison_sessions(created_at DESC);
CREATE INDEX idx_comparison_category ON public.comparison_sessions((metadata->>'category'));
CREATE INDEX idx_comparison_public ON public.comparison_sessions((metadata->>'isPublic'));

-- =====================================================
-- SCORING TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.scoring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Criteria (JSONB array)
  criteria JSONB NOT NULL,
  -- [{ name, description, weight, scoringMethod, options }]

  -- Categorization
  category TEXT DEFAULT 'general',

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scoring_templates_user ON public.scoring_templates(user_id);
CREATE INDEX idx_scoring_templates_public ON public.scoring_templates(is_public);
CREATE INDEX idx_scoring_templates_category ON public.scoring_templates(category);

-- =====================================================
-- MODEL BENCHMARKS TABLE (for analytics/leaderboard)
-- =====================================================
CREATE TABLE public.model_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  model TEXT NOT NULL,
  category TEXT DEFAULT 'all',
  period TEXT DEFAULT 'all-time', -- "2025-01", "all-time", etc.

  -- Aggregated stats
  stats JSONB NOT NULL DEFAULT '{
    "totalComparisons": 0,
    "winRate": 0,
    "avgScore": 0,
    "avgLatency": 0,
    "avgCost": 0,
    "avgTokens": 0
  }'::jsonb,

  -- Distribution data
  distribution JSONB DEFAULT '{
    "scores": [],
    "latencies": []
  }'::jsonb,

  -- Last update
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index per model/category/period
CREATE UNIQUE INDEX idx_benchmarks_unique ON public.model_benchmarks(model, category, period);
CREATE INDEX idx_benchmarks_category ON public.model_benchmarks(category);

-- =====================================================
-- FILES TABLE
-- =====================================================
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  type TEXT, -- "image", "document", etc.
  size BIGINT,

  -- Storage info
  storage_provider TEXT DEFAULT 'local', -- "local", "s3", "supabase-storage"
  storage_url TEXT,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_files_user ON public.files(user_id);
CREATE INDEX idx_files_created ON public.files(created_at DESC);

-- =====================================================
-- TRANSACTIONS TABLE (for credits/billing)
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Related entities
  comparison_session_id UUID REFERENCES public.comparison_sessions(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- =====================================================
-- ROLES & GROUPS TABLES (for RBAC)
-- =====================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparison_sessions_updated_at
  BEFORE UPDATE ON public.comparison_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment comparison count
CREATE OR REPLACE FUNCTION increment_comparison_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    comparisons_count = comparisons_count + 1,
    comparisons_this_month = comparisons_this_month + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's remaining comparisons
CREATE OR REPLACE FUNCTION get_remaining_comparisons(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_plan TEXT;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT subscription_plan, comparisons_this_month
  INTO v_plan, v_used
  FROM public.profiles
  WHERE id = p_user_id;

  -- Define limits per plan
  v_limit := CASE v_plan
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 1000
    WHEN 'team' THEN 5000
    WHEN 'enterprise' THEN 999999
    ELSE 100
  END;

  RETURN GREATEST(0, v_limit - v_used);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.comparison_sessions IS 'AI model comparison sessions (replaces MongoDB conversations)';
COMMENT ON TABLE public.scoring_templates IS 'Custom scoring criteria templates';
COMMENT ON TABLE public.model_benchmarks IS 'Aggregated model performance statistics';

-- =====================================================
-- END OF INITIAL SCHEMA
-- =====================================================
