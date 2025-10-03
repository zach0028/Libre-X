#!/bin/bash

# Configuration Supabase
PROJECT_ID="lcsidczjexcfxajuoaiw"
PROJECT_URL="https://lcsidczjexcfxajuoaiw.supabase.co"

echo "🔗 Liaison avec le projet Supabase..."

# Créer le fichier de configuration Supabase
mkdir -p .supabase

# Essayer de lier le projet
supabase link --project-ref $PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Projet lié avec succès!"
    
    echo ""
    echo "🚀 Exécution des migrations SQL..."
    
    # Exécuter les migrations
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "════════════════════════════════════════════════════"
        echo "  ✅ MIGRATIONS EXÉCUTÉES AVEC SUCCÈS!"
        echo "════════════════════════════════════════════════════"
        echo ""
        echo "Vous pouvez maintenant démarrer l'application:"
        echo "  npm run server"
        echo ""
    else
        echo "❌ Erreur lors de l'exécution des migrations"
        echo ""
        echo "Solution alternative: Exécutez manuellement dans Supabase Dashboard"
        echo "https://app.supabase.com/project/lcsidczjexcfxajuoaiw/sql/new"
    fi
else
    echo "❌ Erreur de liaison. Tentative alternative..."
    echo ""
    echo "Utilisation de l'API REST pour exécuter les migrations..."
fi
