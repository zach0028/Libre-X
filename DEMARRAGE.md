# 🚀 Guide de Démarrage - Libre-X

**Version:** 2.0 - Post-Migration Supabase  
**Date:** 2 Octobre 2025

---

## ⚡ Démarrage Rapide

### Pré-requis

✅ Migration SQL 004 exécutée dans Supabase  
✅ Fichier `.env` configuré à la racine  
✅ Fichier `client/.env.local` configuré

---

## 🎯 Lancer l'Application (2 Terminaux)

### Terminal 1 - Backend

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
pnpm run backend
```

**Attendez de voir :**
```
✅ Connected to Supabase PostgreSQL
🚀 Using Supabase Authentication
Server listening at http://localhost:9087
```

**Si vous voyez des erreurs**, consultez la section "Dépannage" ci-dessous.

---

### Terminal 2 - Frontend

**⚠️ IMPORTANT : Attendez que le backend affiche "Server listening" avant de continuer !**

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X/client
pnpm run dev
```

**Vous verrez :**
```
VITE v6.3.6  ready in XXX ms

➜  Local:   http://localhost:3090/
```

---

### 🌐 Ouvrir dans le Navigateur

**URL :** `http://localhost:3090`

**Vous devriez voir :**
- Page de login/register ✅
- Pas d'écran noir ✅
- Pas d'erreurs dans la console ✅

---

## 🧪 Tests de Vérification

**Avant de lancer le frontend, testez le backend :**

```bash
# Test 1 - Health check
curl http://localhost:9087/health
# Réponse attendue : OK

# Test 2 - Config endpoint
curl http://localhost:9087/api/config
# Réponse attendue : Un JSON avec la configuration

# Test 3 - Vérifier le processus
lsof -i :9087
# Doit afficher un processus node
```

**Si l'un de ces tests échoue, NE LANCEZ PAS le frontend !**

---

## 🐛 Dépannage

### Problème 1 : Backend - "Supabase connection failed"

**Solution :** Vérifiez votre fichier `.env` :

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
cat .env
```

**Doit contenir :**
```bash
DB_MODE=supabase
SUPABASE_URL=https://lcsidczjexcfxajuoaiw.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjc2lkY3pqZXhjZnhhanVvYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzOTUwNiwiZXhwIjoyMDc0OTE1NTA2fQ.Z5OKMcrtzlbiLobmrPbLTtjKO0_BKM0NRdpNguQhZIA
PORT=9087
```

---

### Problème 2 : Frontend - Écran Noir/Bloqué

**Cause :** Le backend n'est pas lancé ou ne répond pas.

**Solution :**

1. **Vérifier que le backend tourne :**
   ```bash
   lsof -i :9087
   ```

2. **Si rien ne s'affiche**, lancer le backend d'abord !

3. **Tester manuellement :**
   ```bash
   curl http://localhost:9087/api/config
   ```

4. **Si ça répond**, alors relancer le frontend :
   ```bash
   cd client
   # Arrêter avec Ctrl+C si il tourne
   pnpm run dev
   ```

---

### Problème 3 : Frontend - Erreurs CORS

**Si vous voyez dans la console :**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution :** Vérifier `client/vite.config.ts` lignes 17-24 :

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:9087',  // ← Doit être 9087 !
    changeOrigin: true,
  },
```

---

### Problème 4 : Port 9087 déjà utilisé

```bash
# Trouver et tuer le processus
lsof -ti:9087 | xargs kill -9

# Relancer le backend
pnpm run backend
```

---

### Problème 5 : Port 3090 déjà utilisé

```bash
# Utiliser un autre port
cd client
PORT=3000 pnpm run dev
```

---

## 📊 Checklist de Démarrage

### Avant de Lancer

- [ ] Migration SQL 004 exécutée ✅
- [ ] Fichier `.env` existe et est correct
- [ ] Fichier `client/.env.local` existe
- [ ] Port 9087 est libre
- [ ] Port 3090 est libre

### Processus de Lancement

- [ ] **Terminal 1** : Backend lancé
- [ ] Backend affiche "Server listening at http://localhost:9087"
- [ ] Test `curl http://localhost:9087/health` retourne "OK"
- [ ] **Terminal 2** : Frontend lancé
- [ ] Frontend affiche "Local: http://localhost:3090/"
- [ ] Navigateur : `http://localhost:3090` affiche l'interface

---

## 🔍 Vérification Console Navigateur

**Ouvrir la console (F12) et vérifier :**

✅ **Pas d'erreurs rouges**  
✅ **Requête GET /api/config → Status 200**  
✅ **Requête POST /api/auth/refresh → Status 200 ou 401 (normal si pas connecté)**

❌ **Si vous voyez "ECONNREFUSED"** → Backend pas lancé !

---

## 📝 Commandes Utiles

### Voir les logs du backend

```bash
tail -f api/logs/debug-$(date +%Y-%m-%d).log
```

### Voir les erreurs

```bash
tail -f api/logs/error-$(date +%Y-%m-%d).log
```

### Arrêter proprement

```bash
# Dans chaque terminal : Ctrl + C
```

---

## 🎯 Ordre Critique

**⚠️ TOUJOURS dans cet ordre :**

1. ✅ Backend D'ABORD
2. ⏳ Attendre "Server listening"
3. ✅ Frontend ENSUITE
4. 🌐 Ouvrir le navigateur

**❌ Si vous lancez le frontend avant le backend, il restera bloqué sur l'écran de chargement !**

---

## 💡 Astuce Pro

**Pour éviter d'oublier l'ordre, créer ce script :**

```bash
#!/bin/bash
# start.sh

echo "🚀 Démarrage de Libre-X..."
echo ""
echo "1️⃣ Lancement du BACKEND..."
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
pnpm run backend &
BACKEND_PID=$!

echo "⏳ Attente du backend (10 secondes)..."
sleep 10

echo ""
echo "2️⃣ Lancement du FRONTEND..."
cd client
pnpm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Terminé !"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📍 Ouvrez : http://localhost:3090"
echo ""
echo "Pour arrêter :"
echo "   kill $BACKEND_PID $FRONTEND_PID"
```

**Utilisation :**
```bash
chmod +x start.sh
./start.sh
```

---

## 🆘 Support

**Si rien ne fonctionne :**

1. Vérifier les logs : `api/logs/error-*.log`
2. Vérifier la console du navigateur (F12)
3. Tester manuellement les endpoints avec `curl`
4. Consulter `GUIDE_DEMARRAGE_RAPIDE.md`

---

**Créé le :** 2 Octobre 2025  
**Dernière mise à jour :** Après correction du bug vite.config.ts

