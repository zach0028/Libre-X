#!/bin/bash

# ==================================================
# Script d'Arrêt - Libre-X
# ==================================================

PROJECT_DIR="/Users/zacharieelbaz/Documents/GitHub/Libre-X"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Arrêt de Libre-X...${NC}"
echo ""

# Arrêter via les PIDs sauvegardés
if [ -f "$PROJECT_DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_DIR/.backend.pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Arrêt du backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        rm "$PROJECT_DIR/.backend.pid"
        echo -e "${GREEN}✅ Backend arrêté${NC}"
    else
        echo -e "${YELLOW}Backend déjà arrêté${NC}"
        rm "$PROJECT_DIR/.backend.pid" 2>/dev/null || true
    fi
fi

if [ -f "$PROJECT_DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_DIR/.frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Arrêt du frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        rm "$PROJECT_DIR/.frontend.pid"
        echo -e "${GREEN}✅ Frontend arrêté${NC}"
    else
        echo -e "${YELLOW}Frontend déjà arrêté${NC}"
        rm "$PROJECT_DIR/.frontend.pid" 2>/dev/null || true
    fi
fi

# Forcer l'arrêt de tous les processus sur les ports
echo ""
echo -e "${YELLOW}Vérification des ports...${NC}"

if lsof -Pi :9087 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Arrêt forcé du port 9087...${NC}"
    lsof -ti:9087 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 9087 libéré${NC}"
fi

if lsof -Pi :3090 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Arrêt forcé du port 3090...${NC}"
    lsof -ti:3090 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 3090 libéré${NC}"
fi

echo ""
echo -e "${GREEN}✅ Libre-X complètement arrêté !${NC}"
echo ""

