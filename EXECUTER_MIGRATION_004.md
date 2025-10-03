# 📋 Instructions : Exécuter la Migration SQL 004

**⏱️ Temps estimé :** 5 minutes  
**🎯 Objectif :** Ajouter les colonnes manquantes aux tables Supabase

---

## 🚨 IMPORTANT

**Cette migration DOIT être exécutée avant d'utiliser les nouvelles fonctionnalités :**
- Upload de fichiers
- Système de crédits/transactions
- Templates de scoring

---

## 📝 Instructions Étape par Étape

### Étape 1️⃣ : Ouvrir le SQL Editor

**Cliquer sur ce lien :**

```
https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/sql/new
```

Vous devriez voir :
```
┌────────────────────────────────────────┐
│  Supabase SQL Editor                   │
├────────────────────────────────────────┤
│                                        │
│  [New query]  [Saved queries]          │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ -- Enter your SQL here           │ │
│  │                                  │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Run] [Save]                          │
└────────────────────────────────────────┘
```

### Étape 2️⃣ : Ouvrir le fichier de migration

**Sur votre ordinateur, ouvrir :**

```
/Users/zacharieelbaz/Documents/GitHub/Libre-X/supabase/migrations/004_update_files_table.sql
```

**Ou via Terminal :**

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
cat supabase/migrations/004_update_files_table.sql
```

### Étape 3️⃣ : Copier le contenu

**Sélectionner TOUT le contenu du fichier** (Cmd+A) et **copier** (Cmd+C).

Le fichier commence par :
```sql
-- =====================================================
-- UPDATE FILES TABLE - Add missing columns
-- Libre-X Supabase Migration
-- =====================================================
...
```

Et se termine par :
```sql
...
COMMENT ON COLUMN public.profiles.token_balance IS 'User token credit balance';
```

### Étape 4️⃣ : Coller dans SQL Editor

**Dans le SQL Editor de Supabase, coller** (Cmd+V) tout le contenu.

Vous devriez voir le SQL complet dans l'éditeur.

### Étape 5️⃣ : Exécuter la migration

**Cliquer sur le bouton "Run" ▶️** en haut à droite.

### Étape 6️⃣ : Attendre le résultat

Vous devriez voir **l'un de ces résultats** :

#### ✅ Succès

```
┌────────────────────────────────────────┐
│  ✓ Success                             │
│  Query executed successfully           │
│  Rows affected: 0                      │
└────────────────────────────────────────┘
```

**→ C'EST BON ! La migration est terminée ! 🎉**

#### ❌ Erreur

Si vous voyez une erreur, notez le message et référez-vous à la section "Dépannage" ci-dessous.

---

## 🔍 Vérification

### Vérifier que les colonnes ont été ajoutées

**Dans le SQL Editor, exécuter :**

```sql
-- Vérifier la table files
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'files' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Vous devriez voir ces colonnes :**
- `id`
- `user_id`
- `filename`
- `filepath`
- `type`
- `size`
- `storage_provider`
- `storage_url`
- `usage_count`
- `created_at`
- `expires_at`
- **`file_id`** ← NOUVEAU
- **`bytes`** ← NOUVEAU
- **`width`** ← NOUVEAU
- **`height`** ← NOUVEAU
- **`source`** ← NOUVEAU
- **`metadata`** ← NOUVEAU
- **`updated_at`** ← NOUVEAU

### Vérifier la table transactions

```sql
-- Vérifier la table transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Vous devriez voir :**
- `id`
- `user_id`
- **`transaction_type`** ← (renommé de `type`)
- `amount`
- `currency`
- `description`
- `metadata`
- `comparison_session_id`
- `created_at`
- **`token_type`** ← NOUVEAU
- **`raw_amount`** ← NOUVEAU
- **`token_value`** ← NOUVEAU
- **`rate`** ← NOUVEAU
- **`model`** ← NOUVEAU
- **`context`** ← NOUVEAU

### Vérifier la table profiles

```sql
-- Vérifier la colonne token_balance dans profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('token_balance', 'last_refill');
```

**Vous devriez voir :**
- `token_balance` - numeric
- `last_refill` - timestamp with time zone

---

## 🐛 Dépannage

### Erreur : "relation does not exist"

**Cause :** Les migrations 001, 002, 003 n'ont pas été exécutées.

**Solution :**
```bash
# Exécuter d'abord les migrations précédentes
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
# 3. supabase/migrations/003_fix_rls_policies.sql
# 4. Puis 004_update_files_table.sql
```

### Erreur : "column already exists"

**Cause :** La migration a déjà été exécutée partiellement.

**Solution :**

C'est normal ! Le SQL utilise `ADD COLUMN IF NOT EXISTS`, donc c'est safe.

Si certaines colonnes existent déjà, elles seront ignorées.

### Erreur : "permission denied"

**Cause :** Vous utilisez le mauvais token ou vous n'avez pas les droits.

**Solution :**
1. Assurez-vous d'être connecté à Supabase Dashboard
2. Assurez-vous d'être sur le bon projet
3. Utilisez le SQL Editor (pas l'API)

### Erreur : autre

**Copier le message d'erreur et :**
1. Lire le message attentivement
2. Chercher la ligne qui pose problème
3. Vérifier les logs Supabase : https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/logs/explorer

---

## ✅ Confirmation Finale

**Après avoir exécuté la migration avec succès :**

### Test 1 : Démarrer le serveur

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
pnpm run backend
```

**Vous devriez voir :**
```
✅ Connected to Supabase PostgreSQL
✅ Server listening at http://localhost:9087
🔵 [DB Router] Using SUPABASE database
```

**Aucune erreur "column does not exist" !**

### Test 2 : Health check

```bash
curl http://localhost:9087/health
```

**Réponse :** `OK`

### Test 3 : Register un utilisateur

```bash
curl -X POST http://localhost:9087/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@libre-x.com",
    "password": "Test1234!",
    "name": "Test User"
  }'
```

**Réponse attendue :**
```json
{
  "user": {
    "id": "...",
    "email": "test@libre-x.com"
  },
  "session": {
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

**✅ Si tout fonctionne, la migration est réussie ! 🎉**

---

## 🎯 Prochaines Étapes

Une fois la migration 004 exécutée avec succès :

1. ✅ Démarrer le serveur : `pnpm run backend`
2. ✅ Tester l'API (voir **GUIDE_DEMARRAGE_RAPIDE.md**)
3. ✅ Développer vos fonctionnalités
4. ✅ Profiter de Libre-X ! 🚀

---

## 📚 Documentation

- **GUIDE_DEMARRAGE_RAPIDE.md** - Guide utilisateur complet
- **MIGRATION_SUPABASE_COMPLETE.md** - Rapport technique détaillé
- **RESUME_MIGRATION.md** - Résumé de la migration

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. **Vérifier les logs :**
   ```bash
   tail -f api/logs/error-*.log
   ```

2. **Vérifier Supabase Dashboard :**
   - Tables : https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/editor
   - Logs : https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/logs/explorer

3. **Re-lire ce guide** attentivement

---

**Bonne chance ! 🍀**

---

**Créé le :** 1er Octobre 2025  
**Version :** 1.0


