-- =====================================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- Libre-X Supabase Migration
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can view public sessions" ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.comparison_sessions;

-- =====================================================
-- PROFILES POLICIES (Fixed - No Recursion)
-- =====================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for backend operations)
-- No need for admin policy with recursion

-- =====================================================
-- COMPARISON SESSIONS POLICIES (Simplified)
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "sessions_select_own"
  ON public.comparison_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public sessions
CREATE POLICY "sessions_select_public"
  ON public.comparison_sessions FOR SELECT
  USING ((metadata->>'isPublic')::boolean = true);

-- Users can create their own sessions
CREATE POLICY "sessions_insert_own"
  ON public.comparison_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "sessions_update_own"
  ON public.comparison_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "sessions_delete_own"
  ON public.comparison_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SCORING TEMPLATES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own templates" ON public.scoring_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.scoring_templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.scoring_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.scoring_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.scoring_templates;

-- Users can view their own templates
CREATE POLICY "templates_select_own"
  ON public.scoring_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public templates
CREATE POLICY "templates_select_public"
  ON public.scoring_templates FOR SELECT
  USING (is_public = true);

-- Users can create templates
CREATE POLICY "templates_insert_own"
  ON public.scoring_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "templates_update_own"
  ON public.scoring_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "templates_delete_own"
  ON public.scoring_templates FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MODEL BENCHMARKS POLICIES (Public Read)
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view benchmarks" ON public.model_benchmarks;
DROP POLICY IF EXISTS "Service can update benchmarks" ON public.model_benchmarks;

-- Anyone can view benchmarks (even unauthenticated)
CREATE POLICY "benchmarks_select_all"
  ON public.model_benchmarks FOR SELECT
  USING (true);

-- Only service role can insert/update benchmarks
-- (Handled by service_role key, no policy needed)

-- =====================================================
-- FILES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can create files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;

-- Users can view their own files
CREATE POLICY "files_select_own"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

-- Users can upload files
CREATE POLICY "files_insert_own"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "files_delete_own"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

-- Users can view their own transactions
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert transactions

-- =====================================================
-- ROLES POLICIES (Admin Only)
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

-- Public read for roles
CREATE POLICY "roles_select_all"
  ON public.roles FOR SELECT
  USING (true);

-- Service role manages roles (no policy needed)

-- =====================================================
-- GROUPS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Group owners can manage groups" ON public.groups;

-- Users can view groups they're members of
CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Group owners can update their groups
CREATE POLICY "groups_update_owner"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can create groups
CREATE POLICY "groups_insert_own"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- GROUP MEMBERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

-- Users can view members of groups they belong to
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Group owners can add members
CREATE POLICY "group_members_insert_owner"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

-- Group owners can remove members
CREATE POLICY "group_members_delete_owner"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

-- =====================================================
-- DONE - All policies fixed without recursion
-- =====================================================
