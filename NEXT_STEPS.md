# 🚀 Next Steps - MongoDB to Supabase Migration

## ✅ Completed (Day 1 - 60%)

You've successfully completed the foundational migration work:

1. ✅ **PostgreSQL Schema** - 9 tables with indexes, triggers, and helper functions
2. ✅ **RLS Policies** - ~20 security policies for data isolation
3. ✅ **Backend Infrastructure**:
   - `api/db/supabase.js` - Supabase admin client
   - `api/db/supabaseAdapter.js` - MongoDB-compatible adapter layer
4. ✅ **Model Migrations**:
   - `api/models/supabase/userModel.js` - Complete user operations
   - `api/models/supabase/comparisonSessionModel.js` - AI comparison sessions
5. ✅ **Documentation** - Complete migration tracking and instructions

---

## 🔥 IMMEDIATE ACTIONS REQUIRED (Before continuing)

### Step 1: Execute SQL Migrations (15 minutes) 🚨

**Why this is critical:** All backend code depends on these database tables existing.

1. **Open Supabase Dashboard**
   ```
   https://app.supabase.com/project/lcsidczjexcfxajuoaiw/sql/new
   ```

2. **Run Migration 001 (Initial Schema)**
   - Open file: `supabase/migrations/001_initial_schema.sql`
   - Copy **ALL** content (800+ lines)
   - Paste into SQL Editor
   - Click **"Run"** (or Ctrl+Enter)
   - ✅ Wait for "Success. No rows returned"

3. **Run Migration 002 (RLS Policies)**
   - Open file: `supabase/migrations/002_rls_policies.sql`
   - Copy **ALL** content (300+ lines)
   - Paste into SQL Editor (new query)
   - Click **"Run"**
   - ✅ Wait for "Success"

4. **Verify Tables Created**
   - Go to **"Table Editor"** in sidebar
   - You should see these tables:
     ```
     ✅ profiles
     ✅ comparison_sessions
     ✅ scoring_templates
     ✅ model_benchmarks
     ✅ files
     ✅ transactions
     ✅ roles
     ✅ groups
     ✅ group_members
     ```

**Troubleshooting:**
- If you see "relation already exists" → Tables already created, you're good!
- If you see "permission denied" → Make sure you're logged into the correct project
- If you see other errors → Check the full error message in SQL Editor

---

### Step 2: Create Environment File (2 minutes)

```bash
# In project root directory
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X

# Copy example file to .env
cp .env.supabase.example .env

# The file already contains your credentials:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_KEY
# - DB_MODE=supabase
```

**Verify .env contents:**
```bash
cat .env | grep SUPABASE
```

Expected output:
```
SUPABASE_URL=https://lcsidczjexcfxajuoaiw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DB_MODE=supabase
```

---

### Step 3: Install Supabase Package (2 minutes)

```bash
# Install Supabase JavaScript client
npm install @supabase/supabase-js

# Verify installation
npm list @supabase/supabase-js
```

Expected output:
```
@supabase/supabase-js@2.x.x
```

---

## 🎯 Phase 2: Backend Authentication (2-3 hours)

Once Steps 1-3 are complete, you'll migrate authentication from Passport.js to Supabase Auth.

### Files to Modify:

1. **`api/server/routes/auth.js`**
   - Current: 6 Passport strategies (Local, JWT, Google, GitHub, Discord, Facebook, Apple)
   - Target: Supabase Auth methods
   - Estimated: 1.5 hours

2. **`api/server/controllers/AuthController.js`**
   - Current: Complex user registration logic
   - Target: Simplified Supabase Auth calls
   - Estimated: 1 hour

3. **`api/server/middleware/requireJwtAuth.js`**
   - Current: Passport JWT verification
   - Target: Supabase JWT verification
   - Estimated: 30 minutes

### Key Changes:

**Before (Passport.js):**
```javascript
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;

// 75 lines of strategy configuration...
passport.use(new LocalStrategy({ ... }, async (email, password, done) => {
  // Manual password verification
  // Manual user lookup
  // Manual session management
}));
```

**After (Supabase Auth):**
```javascript
const { supabaseAdmin } = require('~/db/supabase');

async function login(req, res) {
  const { email, password } = req.body;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(401).json({ error: error.message });
  return res.json({ user: data.user, session: data.session });
}
```

**Lines of code reduction:**
- Before: ~200 lines (auth strategies + controllers)
- After: ~50 lines
- **Reduction: 75%**

---

## 🎨 Phase 3: Frontend Integration (1 hour)

### Files to Create/Modify:

1. **Create `client/src/lib/supabase.ts`**
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

2. **Create `client/.env.local`**
   ```env
   VITE_SUPABASE_URL=https://lcsidczjexcfxajuoaiw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Update `client/src/hooks/useAuth.ts`**
   - Replace API calls with Supabase Auth
   - Use `supabase.auth.signUp()`, `signIn()`, `signOut()`

4. **Update Auth Components:**
   - `client/src/components/Auth/Login.tsx`
   - `client/src/components/Auth/Registration.tsx`
   - Use Supabase auth methods instead of fetch to `/api/auth/*`

---

## 🧪 Phase 4: Testing (1 hour)

### Test Checklist:

**Authentication Tests:**
- [ ] User signup with email/password
- [ ] User login with valid credentials
- [ ] User login with invalid credentials (should fail)
- [ ] Password reset flow
- [ ] User logout

**CRUD Tests:**
- [ ] Create comparison session
- [ ] Fetch user's sessions
- [ ] Update session (e.g., add winner)
- [ ] Delete session
- [ ] Verify RLS (user can only see own data)

**Authorization Tests:**
- [ ] Non-authenticated user cannot create session
- [ ] User A cannot see User B's private sessions
- [ ] User A CAN see User B's public sessions
- [ ] Admin role can see all data

### Test Commands:

```bash
# Backend tests
npm run test:api

# Frontend tests
npm run test:client

# E2E tests
npm run e2e
```

---

## 📊 Migration Progress Tracker

### Backend Migration Status:

| Component | Status | Files | Lines |
|-----------|--------|-------|-------|
| Database Schema | ✅ Done | 2 SQL files | 1100 |
| DB Adapters | ✅ Done | 2 JS files | 450 |
| User Model | ✅ Done | 1 JS file | 300 |
| Session Model | ✅ Done | 1 JS file | 400 |
| Auth Routes | ⏳ Pending | 3 JS files | ~150 |
| Auth Middleware | ⏳ Pending | 2 JS files | ~50 |
| File Model | ⏳ Optional | 1 JS file | ~200 |

**Total:** 60% complete

### Frontend Migration Status:

| Component | Status | Files | Lines |
|-----------|--------|-------|-------|
| Supabase Client | ⏳ Pending | 1 TS file | 20 |
| Auth Hook | ⏳ Pending | 1 TS file | 100 |
| Login Component | ⏳ Pending | 1 TSX file | 50 |
| Register Component | ⏳ Pending | 1 TSX file | 50 |
| Auth Context | ⏳ Pending | 1 TS file | 80 |

**Total:** 0% complete (blocked until backend auth is done)

---

## 🚨 Common Issues & Solutions

### Issue: "Cannot find module '@supabase/supabase-js'"
**Solution:** Run `npm install @supabase/supabase-js`

### Issue: "relation does not exist"
**Solution:** Execute SQL migrations in Supabase Dashboard (Step 1 above)

### Issue: "PGRST116: Not Found"
**Solution:** Check RLS policies are enabled. User must be authenticated.

### Issue: "Invalid API key"
**Solution:** Check `.env` file has correct `SUPABASE_URL` and keys

### Issue: "Permission denied for schema public"
**Solution:** Use `SUPABASE_SERVICE_KEY` in backend (not ANON_KEY)

---

## 📚 Resources

### Supabase Documentation:
- **Auth Guide:** https://supabase.com/docs/guides/auth
- **Database Guide:** https://supabase.com/docs/guides/database
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **JavaScript Client:** https://supabase.com/docs/reference/javascript/introduction

### Project Files:
- **Migration Status:** [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)
- **Supabase Instructions:** [supabase/README.md](./supabase/README.md)
- **Credentials Example:** [.env.supabase.example](./.env.supabase.example)

### Supabase Dashboard:
- **Project URL:** https://app.supabase.com/project/lcsidczjexcfxajuoaiw
- **SQL Editor:** https://app.supabase.com/project/lcsidczjexcfxajuoaiw/sql/new
- **Table Editor:** https://app.supabase.com/project/lcsidczjexcfxajuoaiw/editor
- **Auth Users:** https://app.supabase.com/project/lcsidczjexcfxajuoaiw/auth/users

---

## 🎉 Success Criteria

### Migration Complete When:

- ✅ SQL migrations executed successfully
- ✅ 9 tables visible in Supabase Table Editor
- ✅ User can signup via frontend
- ✅ User can login via frontend
- ✅ User can create comparison session
- ✅ User can see their own sessions (but not others')
- ✅ RLS policies work correctly
- ✅ OAuth providers work (Google, GitHub, etc.) - Optional
- ✅ Old MongoDB code disabled/removed

### Timeline:

- **Day 1 (Completed):** Database + Models - 60% ✅
- **Day 2 (Next):** Auth Migration + Frontend - 35%
- **Day 3 (Optional):** Tests + Polish - 5%

**Total Estimated Time Remaining:** 4-6 hours

---

## 🤝 Need Help?

If you encounter issues:

1. Check [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) for current state
2. Check [supabase/README.md](./supabase/README.md) for troubleshooting
3. Review Supabase Dashboard logs
4. Check browser console for frontend errors
5. Check `api/logs/` for backend errors

---

**Last Updated:** Day 1 - 60% Complete
**Next Action:** Execute SQL migrations (Step 1 above)
