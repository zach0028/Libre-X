#!/bin/bash

# ==================================================
# Script de Démarrage Automatique - Libre-X
# ==================================================

set -e

PROJECT_DIR="/Users/zacharieelbaz/Documents/GitHub/Libre-X"
LOG_FILE="$PROJECT_DIR/startup.log"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}    🚀 Libre-X - Démarrage Automatique    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ==================================================
# 1. Vérifications Pré-Démarrage
# ==================================================

echo -e "${YELLOW}📋 Vérifications pré-démarrage...${NC}"

# Vérifier .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}❌ Fichier .env manquant !${NC}"
    echo "   Créez le fichier .env à la racine du projet"
    exit 1
fi

# Vérifier client/.env.local
if [ ! -f "$PROJECT_DIR/client/.env.local" ]; then
    echo -e "${RED}❌ Fichier client/.env.local manquant !${NC}"
    echo "   Créez le fichier .env.local dans le dossier client/"
    exit 1
fi

# Vérifier que les ports sont libres
if lsof -Pi :9087 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 9087 déjà utilisé. Arrêt du processus...${NC}"
    lsof -ti:9087 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :3090 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3090 déjà utilisé. Arrêt du processus...${NC}"
    lsof -ti:3090 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo -e "${GREEN}✅ Vérifications terminées${NC}"
echo ""

# ==================================================
# 2. Lancement du Backend
# ==================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  Lancement du BACKEND (API)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_DIR"
echo "📁 Répertoire : $PROJECT_DIR"
echo "🔧 Commande : pnpm run backend"
echo ""

# Lancer le backend en arrière-plan
pnpm run backend > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✅ Backend lancé (PID: $BACKEND_PID)${NC}"
echo ""

# Attendre que le backend soit prêt
echo -e "${YELLOW}⏳ Attente du backend...${NC}"

MAX_WAIT=30
COUNTER=0
BACKEND_READY=false

while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s http://localhost:9087/health >/dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    echo -n "."
    sleep 1
    COUNTER=$((COUNTER + 1))
done

echo ""

if [ "$BACKEND_READY" = true ]; then
    echo -e "${GREEN}✅ Backend prêt ! (http://localhost:9087)${NC}"
    echo ""
else
    echo -e "${RED}❌ Le backend n'a pas démarré dans les ${MAX_WAIT} secondes${NC}"
    echo "   Consultez les logs : $LOG_FILE"
    echo "   Ou lancez manuellement : pnpm run backend"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# ==================================================
# 3. Lancement du Frontend
# ==================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  Lancement du FRONTEND (React)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_DIR/client"
echo "📁 Répertoire : $PROJECT_DIR/client"
echo "🔧 Commande : pnpm run dev"
echo ""

# Lancer le frontend en arrière-plan
pnpm run dev > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Frontend lancé (PID: $FRONTEND_PID)${NC}"
echo ""

# Attendre que le frontend soit prêt
echo -e "${YELLOW}⏳ Attente du frontend...${NC}"

MAX_WAIT=20
COUNTER=0
FRONTEND_READY=false

while [ $COUNTER -lt $MAX_WAIT ]; do
    if lsof -Pi :3090 -sTCP:LISTEN -t >/dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    echo -n "."
    sleep 1
    COUNTER=$((COUNTER + 1))
done

echo ""

if [ "$FRONTEND_READY" = true ]; then
    echo -e "${GREEN}✅ Frontend prêt ! (http://localhost:3090)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend prend du temps à démarrer...${NC}"
    echo "   Vérifiez manuellement : http://localhost:3090"
fi

# ==================================================
# 4. Résumé
# ==================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}    ✅ Libre-X Démarré avec Succès !    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🌐 URL Frontend :${NC}  http://localhost:3090"
echo -e "${GREEN}🔧 URL Backend  :${NC}  http://localhost:9087"
echo ""
echo -e "${YELLOW}📊 PIDs :${NC}"
echo "   Backend  : $BACKEND_PID"
echo "   Frontend : $FRONTEND_PID"
echo ""
echo -e "${YELLOW}📝 Logs :${NC}"
echo "   Backend  : $LOG_FILE"
echo "   Frontend : $PROJECT_DIR/frontend.log"
echo ""
echo -e "${YELLOW}🛑 Pour arrêter :${NC}"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${GREEN}💡 Astuce :${NC} Ouvrez http://localhost:3090 dans votre navigateur"
echo ""

# Sauvegarder les PIDs
echo "$BACKEND_PID" > "$PROJECT_DIR/.backend.pid"
echo "$FRONTEND_PID" > "$PROJECT_DIR/.frontend.pid"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Les serveurs tournent en arrière-plan.${NC}"
echo -e "${YELLOW}Appuyez sur Ctrl+C pour quitter (les serveurs continueront).${NC}"
echo ""

# Attendre Ctrl+C
trap "echo ''; echo 'Script terminé. Les serveurs tournent toujours.'; exit 0" INT

# Garder le script en vie pour afficher les PIDs
wait

