# ✅ Activer l'Enregistrement des Utilisateurs

## 🔴 Problème

L'inscription est **désactivée** par défaut :
```json
"registrationEnabled": false
```

## ✅ Solution

### Méthode 1 : Modifier le fichier .env

```bash
cd /Users/zacharieelbaz/Documents/GitHub/Libre-X
nano .env
```

**Ajoutez cette ligne à la fin du fichier :**

```bash
# Registration
ALLOW_REGISTRATION=true
```

**Sauvegardez :** `Ctrl + X`, puis `Y`, puis `Enter`

---

### Méthode 2 : Via Terminal (rapide)

```bash
echo "" >> .env
echo "# Registration" >> .env
echo "ALLOW_REGISTRATION=true" >> .env
```

---

## 🔄 Redémarrer le Backend

```bash
# Arrêter
lsof -ti:9087 | xargs kill -9

# Relancer
npm run backend
```

---

## ✅ Vérification

```bash
curl -s http://localhost:9087/api/config | grep registrationEnabled
```

**Devrait afficher :**
```json
"registrationEnabled":true,
```

---

**Ensuite actualisez le navigateur sur http://localhost:3090**

Vous devriez voir le bouton "Register" actif ! ✅

