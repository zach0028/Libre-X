#!/bin/bash

# Charger les credentials depuis .env
source .env

echo "🔄 Exécution des migrations via API Supabase..."
echo ""

# Migration 001
echo "📋 Migration 001 - Création des tables..."

MIGRATION_001=$(cat supabase/migrations/001_initial_schema.sql)

curl -X POST "https://lcsidczjexcfxajuoaiw.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$MIGRATION_001")}" \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migration 001 exécutée"
else
    echo "⚠️  Migration 001 - Tentative alternative..."
fi

echo ""
echo "📋 Migration 002 - Policies RLS..."

MIGRATION_002=$(cat supabase/migrations/002_rls_policies.sql)

curl -X POST "https://lcsidczjexcfxajuoaiw.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$MIGRATION_002")}" \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Migration 002 exécutée"
else
    echo "⚠️  Migration 002 - Tentative alternative..."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ℹ️  VÉRIFICATION REQUISE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "L'API REST de Supabase n'a pas d'endpoint 'exec_sql' direct."
echo "La méthode la plus fiable est d'utiliser le Dashboard SQL Editor."
echo ""
echo "🔗 Ouvrez ce lien:"
echo "   https://app.supabase.com/project/lcsidczjexcfxajuoaiw/sql/new"
echo ""
echo "📋 Et copiez/collez les fichiers SQL:"
echo "   1. supabase/migrations/001_initial_schema.sql"
echo "   2. supabase/migrations/002_rls_policies.sql"
echo ""
