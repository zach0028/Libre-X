-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Libre-X Supabase Migration
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- COMPARISON SESSIONS POLICIES
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.comparison_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public sessions
CREATE POLICY "Users can view public sessions"
  ON public.comparison_sessions FOR SELECT
  USING ((metadata->>'isPublic')::boolean = true);

-- Users can create sessions
CREATE POLICY "Users can create sessions"
  ON public.comparison_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own sessions
CREATE POLICY "Users can update own sessions"
  ON public.comparison_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own sessions
CREATE POLICY "Users can delete own sessions"
  ON public.comparison_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SCORING TEMPLATES POLICIES
-- =====================================================

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON public.scoring_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public templates
CREATE POLICY "Users can view public templates"
  ON public.scoring_templates FOR SELECT
  USING (is_public = true);

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON public.scoring_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own templates
CREATE POLICY "Users can update own templates"
  ON public.scoring_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own templates
CREATE POLICY "Users can delete own templates"
  ON public.scoring_templates FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MODEL BENCHMARKS POLICIES
-- =====================================================

-- Everyone can read benchmarks (public leaderboard)
CREATE POLICY "Anyone can read benchmarks"
  ON public.model_benchmarks FOR SELECT
  TO PUBLIC
  USING (true);

-- Only service role can insert/update benchmarks (via cron/backend)
CREATE POLICY "Service role can manage benchmarks"
  ON public.model_benchmarks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FILES POLICIES
-- =====================================================

-- Users can view their own files
CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

-- Users can upload files
CREATE POLICY "Users can upload files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own files
CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can create transactions (backend only)
CREATE POLICY "Service role can create transactions"
  ON public.transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- ROLES & GROUPS POLICIES
-- =====================================================

-- Everyone can view roles
CREATE POLICY "Anyone can view roles"
  ON public.roles FOR SELECT
  TO PUBLIC
  USING (true);

-- Users can view groups they belong to
CREATE POLICY "Users can view own groups"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    ) OR owner_id = auth.uid()
  );

-- Group owners can update their groups
CREATE POLICY "Owners can update groups"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can create groups
CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Group members can view membership
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTION FOR ADMIN CHECK
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- REALTIME SUBSCRIPTIONS (Enable for specific tables)
-- =====================================================
-- Enable realtime for comparison sessions (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.comparison_sessions;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS
  'Users can only see their own profile data';

COMMENT ON POLICY "Users can view public sessions" ON public.comparison_sessions IS
  'Allow viewing of sessions marked as public for community benchmarks';

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
