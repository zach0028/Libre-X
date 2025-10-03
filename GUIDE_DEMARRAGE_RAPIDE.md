# 🚀 Guide de Démarrage Rapide - Libre-X Supabase

**Version:** 2.0 - Migration Complète  
**Date:** 1er Octobre 2025

---

## ⚡ Démarrage en 5 Minutes

### 1️⃣ Exécuter la Migration SQL

**Étape critique avant toute utilisation !**

```bash
# Ouvrir le SQL Editor de Supabase
https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/sql/new
```

**Copier/coller le contenu de:**
```
supabase/migrations/004_update_files_table.sql
```

**Cliquer sur "Run"** ▶️

✅ Vous devriez voir "Success" en vert.

---

### 2️⃣ Vérifier la Configuration

**Backend (`.env`)**

Assurez-vous que votre fichier `.env` à la racine contient :

```bash
DB_MODE=supabase
SUPABASE_URL=https://lcsidczjexcfxajuoaiw.supabase.co
SUPABASE_SERVICE_KEY=votre-service-key-ici
PORT=9087
```

💡 **Astuce:** La `SUPABASE_SERVICE_KEY` se trouve dans :  
Settings → API → Project API keys → `service_role` secret key

---

### 3️⃣ Installer & Démarrer

```bash
# Installer les dépendances (si pas déjà fait)
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
pnpm install

# Démarrer le backend
pnpm run backend

# Le serveur démarre sur http://localhost:9087
```

✅ Si vous voyez :
```
✅ Connected to Supabase PostgreSQL
✅ Server listening at http://localhost:9087
🔵 [DB Router] Using SUPABASE database
```

**Tout fonctionne !** 🎉

---

### 4️⃣ Tester l'API

**Health Check**

```bash
curl http://localhost:9087/health
```

Réponse attendue : `OK`

**Register un utilisateur**

```bash
curl -X POST http://localhost:9087/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@libre-x.com",
    "password": "Demo1234!",
    "name": "Demo User"
  }'
```

**Login**

```bash
curl -X POST http://localhost:9087/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@libre-x.com",
    "password": "Demo1234!"
  }'
```

📋 **Copier le `access_token` de la réponse** pour les requêtes suivantes.

---

## 📝 Utilisation des Nouvelles Fonctionnalités

### 📁 Upload de Fichiers

```bash
TOKEN="votre-access-token-ici"

# Upload une image
curl -X POST http://localhost:9087/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.png"
```

### 💰 Vérifier la Balance de Crédits

```bash
curl http://localhost:9087/api/user \
  -H "Authorization: Bearer $TOKEN"
```

La réponse contiendra `token_balance` avec votre balance.

### 📊 Créer un Scoring Template

```bash
curl -X POST http://localhost:9087/api/presets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Template de Scoring",
    "description": "Critères personnalisés",
    "criteria": [
      {"name": "Précision", "weight": 0.4},
      {"name": "Rapidité", "weight": 0.3},
      {"name": "Clarté", "weight": 0.3}
    ],
    "category": "general"
  }'
```

### 🔍 Lister vos Templates

```bash
curl http://localhost:9087/api/presets \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Fonctionnalités Clés Disponibles

### ✅ Authentification
- ✅ Email/Password
- ✅ JWT Tokens
- ✅ OAuth (Google, GitHub, Discord)
- ✅ Refresh tokens

### ✅ Gestion de Fichiers
- ✅ Upload d'images (PNG, JPG, WEBP)
- ✅ Upload de documents (PDF, TXT, CSV)
- ✅ TTL automatique (expiration)
- ✅ Traitement d'images (Sharp)
- ✅ Multi-provider (S3, Azure, Local)

### ✅ Système de Crédits
- ✅ Balance de tokens
- ✅ Transactions automatiques
- ✅ Auto-refill configurable
- ✅ Historique détaillé

### ✅ Templates de Scoring
- ✅ Critères personnalisés
- ✅ Pondération
- ✅ Templates publics/privés
- ✅ Templates par défaut

### ✅ Comparaison AI
- ✅ Multi-modèles simultanés
- ✅ Streaming en temps réel
- ✅ Mesure de performance
- ✅ Scoring automatique

---

## 🔧 Commandes Utiles

### Backend

```bash
# Développement avec auto-reload
pnpm run backend:dev

# Production
pnpm run backend

# Avec Bun (plus rapide)
bun run b:api

# Arrêter le backend
pnpm run backend:stop
```

### Frontend

```bash
# Développement
cd client
pnpm run dev

# Build production
cd client
pnpm run build
```

### Administration

```bash
# Créer un utilisateur
pnpm run create-user

# Lister les utilisateurs
pnpm run list-users

# Ajouter des crédits
pnpm run add-balance

# Voir les statistiques
pnpm run user-stats
```

---

## 🐛 Dépannage

### Problème: "Cannot connect to Supabase"

**Solution:**
1. Vérifier que la migration 004 est exécutée
2. Vérifier `.env` → `SUPABASE_SERVICE_KEY`
3. Vérifier que le projet Supabase est actif

### Problème: "Table does not exist"

**Solution:**
```bash
# Vérifier les tables dans Supabase
https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/editor

# Devrait afficher 9 tables:
# - profiles
# - comparison_sessions
# - scoring_templates
# - model_benchmarks
# - files
# - transactions
# - roles
# - groups
# - group_members
```

### Problème: "Unauthorized"

**Solution:**
1. Vérifier que le token JWT est valide
2. Utiliser `/api/auth/refresh` pour obtenir un nouveau token
3. Vérifier les RLS policies dans Supabase

### Problème: Port déjà utilisé

**Solution:**
```bash
# Trouver le processus
lsof -ti:9087

# Tuer le processus
kill -9 $(lsof -ti:9087)

# Ou changer le port dans .env
PORT=3080
```

---

## 📊 Dashboard Supabase

**Liens Rapides:**

- **🏠 Dashboard Principal:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw

- **📋 Table Editor:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/editor

- **🔐 Authentication:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/auth/users

- **💾 SQL Editor:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/sql/new

- **📈 Database:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/database/tables

- **🔍 Logs:**  
  https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/logs/explorer

---

## 💡 Astuces Pro

### 1. Mode Verbose pour Debug

```bash
# Backend avec logs détaillés
NODE_ENV=development pnpm run backend:dev
```

### 2. Tester les RLS Policies

```sql
-- Dans Supabase SQL Editor

-- Se connecter en tant qu'utilisateur spécifique
SET request.jwt.claim.sub = 'user-uuid-here';

-- Tester un SELECT
SELECT * FROM files WHERE user_id = 'user-uuid-here';

-- Devrait retourner uniquement les fichiers de cet utilisateur
```

### 3. Monitoring en Temps Réel

```bash
# Logs du serveur en direct
tail -f api/logs/debug-$(date +%Y-%m-%d).log

# Logs d'erreurs
tail -f api/logs/error-$(date +%Y-%m-%d).log
```

### 4. Reset la Base de Données (DEV uniquement)

```sql
-- ⚠️ ATTENTION: Supprime toutes les données!

-- Supprimer toutes les tables (sauf auth.users)
DROP TABLE IF EXISTS public.comparison_sessions CASCADE;
DROP TABLE IF EXISTS public.scoring_templates CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.model_benchmarks CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Puis ré-exécuter toutes les migrations
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

- **README.md** - Documentation générale
- **MIGRATION_SUPABASE_COMPLETE.md** - Rapport technique complet
- **INSTALLATION_COMPLETE.md** - Guide d'installation détaillé
- **supabase/README.md** - Guide migrations SQL

---

## 🎉 C'est Tout !

Vous êtes maintenant prêt à utiliser Libre-X avec Supabase !

**Questions ?**
- Consultez la documentation
- Vérifiez les logs dans `api/logs/`
- Inspectez le dashboard Supabase

**Bon développement ! 🚀**

---

**Créé le:** 1er Octobre 2025  
**Version:** 2.0 - Migration Complète


