# 🗄️ Supabase Migrations - Instructions

## 📋 Exécuter les Migrations

### Option 1: Via Supabase Dashboard (Recommandé - 5 min)

1. **Accédez à votre projet Supabase**
   ```
   https://app.supabase.com/project/lcsidczjexcfxajuoaiw
   ```

2. **Ouvrez l'éditeur SQL**
   - Cliquez sur **"SQL Editor"** dans la sidebar gauche
   - Ou allez directement: https://app.supabase.com/project/lcsidczjexcfxajuoaiw/sql/new

3. **Exécutez la migration 001 (Schéma initial)**
   - Ouvrez le fichier: `supabase/migrations/001_initial_schema.sql`
   - Copiez **TOUT** le contenu
   - Collez dans l'éditeur SQL
   - Cliquez sur **"Run"** (ou Ctrl+Enter)
   - ✅ Attendez le message "Success. No rows returned"

4. **Exécutez la migration 002 (RLS Policies)**
   - Ouvrez le fichier: `supabase/migrations/002_rls_policies.sql`
   - Copiez **TOUT** le contenu
   - Collez dans l'éditeur SQL (nouvelle query)
   - Cliquez sur **"Run"**
   - ✅ Attendez le message "Success"

5. **Vérification**
   - Allez sur **"Table Editor"** dans la sidebar
   - Vous devriez voir les tables:
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

---

### Option 2: Via Supabase CLI (Avancé)

**Prérequis:**
```bash
# Installer Supabase CLI
npm install -g supabase

# Ou avec Homebrew (macOS)
brew install supabase/tap/supabase
```

**Étapes:**

1. **Login Supabase**
   ```bash
   supabase login
   ```

2. **Lier au projet**
   ```bash
   supabase link --project-ref lcsidczjexcfxajuoaiw
   ```

3. **Appliquer migrations**
   ```bash
   supabase db push
   ```

4. **Vérifier status**
   ```bash
   supabase db diff
   ```

---

## 🔍 Vérification Post-Migration

### Test 1: Vérifier Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Résultat attendu:**
```
comparison_sessions
files
group_members
groups
model_benchmarks
profiles
roles
scoring_templates
transactions
```

---

### Test 2: Vérifier RLS Activé
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Résultat attendu:** `rowsecurity = true` pour toutes les tables

---

### Test 3: Vérifier Policies
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Résultat attendu:** Liste de ~20+ policies

---

### Test 4: Tester Fonction Helper
```sql
-- Test get_remaining_comparisons (should work even with no user)
SELECT get_remaining_comparisons('00000000-0000-0000-0000-000000000000'::uuid);
```

---

## 🎨 Seed Data (Optionnel)

Pour tester localement avec des données de démo:

```sql
-- Créer un utilisateur test (après signup via Supabase Auth)
-- Note: Utilisez Supabase Dashboard → Authentication → Add User d'abord

-- Puis créer profil
INSERT INTO public.profiles (id, name, username, role, subscription_plan)
VALUES
  ('USER_ID_HERE', 'Test User', 'testuser', 'pro', 'pro');

-- Créer une template de scoring
INSERT INTO public.scoring_templates (name, description, criteria, is_public)
VALUES (
  'General Evaluation',
  'Template générale pour évaluer les réponses IA',
  '[
    {"name": "accuracy", "description": "Factual correctness", "weight": 0.3, "scoringMethod": "manual"},
    {"name": "clarity", "description": "Clear communication", "weight": 0.25, "scoringMethod": "manual"},
    {"name": "relevance", "description": "Answers the question", "weight": 0.25, "scoringMethod": "manual"},
    {"name": "creativity", "description": "Creative approach", "weight": 0.2, "scoringMethod": "manual"}
  ]'::jsonb,
  true
);

-- Créer une session de comparaison exemple
INSERT INTO public.comparison_sessions (
  user_id,
  title,
  prompt,
  models,
  responses,
  metadata
)
VALUES (
  'USER_ID_HERE',
  'Test Comparison - AI Models',
  '{"text": "Explain quantum computing", "temperature": 0.7, "maxTokens": 1000}'::jsonb,
  ARRAY['gpt-4', 'claude-3-opus', 'gemini-pro'],
  '[]'::jsonb,
  '{"category": "science", "tags": ["physics", "quantum"], "isPublic": false}'::jsonb
);
```

---

## 🔧 Rollback (Si Problème)

### Supprimer toutes les tables et recommencer

```sql
-- ⚠️ ATTENTION: Ceci supprime TOUTES les données !
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.model_benchmarks CASCADE;
DROP TABLE IF EXISTS public.scoring_templates CASCADE;
DROP TABLE IF EXISTS public.comparison_sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS increment_comparison_count CASCADE;
DROP FUNCTION IF EXISTS get_remaining_comparisons CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
```

Puis réexécutez les migrations 001 et 002.

---

## 📊 Monitoring

### Voir les logs des requêtes
- Dashboard → Logs → Postgres Logs

### Voir les métriques
- Dashboard → Reports
  - Database usage
  - API requests
  - Auth events

### Alertes
Configurer dans Dashboard → Settings → Alerts:
- Database size > 400MB (80% du free tier)
- API requests > 40K/jour

---

## 🐛 Troubleshooting

### Erreur: "permission denied for schema public"
**Solution:** Vérifiez que vous utilisez le service_role key, pas l'anon key

### Erreur: "relation already exists"
**Solution:** Tables déjà créées. Utilisez DROP TABLE ou modifiez migration pour utiliser IF NOT EXISTS

### Erreur: "function uuid_generate_v4 does not exist"
**Solution:** Extension UUID manquante. Exécutez:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### RLS bloque tout
**Solution:** Vérifiez que vous êtes authentifié et que les policies sont correctes:
```sql
-- Désactiver temporairement RLS pour debug
ALTER TABLE comparison_sessions DISABLE ROW LEVEL SECURITY;
-- Réactiver après test
ALTER TABLE comparison_sessions ENABLE ROW LEVEL SECURITY;
```

---

## 📚 Ressources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ Checklist Finale

Avant de passer au code backend:

- [ ] Migration 001 exécutée avec succès
- [ ] Migration 002 exécutée avec succès
- [ ] 9 tables créées dans public schema
- [ ] RLS activé sur toutes les tables
- [ ] Policies créées (~20+)
- [ ] Fonctions helper créées (3 fonctions)
- [ ] Test basic query fonctionne
- [ ] Variables d'env configurées (SUPABASE_URL, SUPABASE_SERVICE_KEY)

**Si tous les items sont cochés → Vous êtes prêt pour Phase 2 ! 🚀**

---

*Besoin d'aide? Vérifiez MIGRATION_STATUS.md pour l'état global*
