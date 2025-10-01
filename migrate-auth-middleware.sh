#!/bin/bash

# Script to migrate all route files from requireJwtAuth to universal authMiddleware
# This allows routes to work with both Supabase and Passport authentication

echo "🔄 Migrating authentication middleware in route files..."

# Find all route files using requireJwtAuth (excluding auth.js and supabaseAuth.js)
files=$(find api/server/routes -name "*.js" -type f ! -name "auth.js" ! -name "supabaseAuth.js" -exec grep -l "requireJwtAuth" {} \;)

count=0

for file in $files; do
    echo "  📝 Updating: $file"

    # Replace the require statement
    sed -i.bak "s|const requireJwtAuth = require('~/server/middleware/requireJwtAuth');|const requireAuth = require('~/server/middleware/authMiddleware'); // Universal auth|g" "$file"

    # Replace usage in router.use()
    sed -i.bak "s|router\.use(requireJwtAuth);|router.use(requireAuth); // Works with both Supabase and Passport|g" "$file"

    # Replace usage in individual routes
    sed -i.bak "s|requireJwtAuth,|requireAuth,|g" "$file"
    sed -i.bak "s|requireJwtAuth)|requireAuth)|g" "$file"

    # Remove backup file
    rm -f "${file}.bak"

    count=$((count + 1))
done

echo "✅ Migration complete! Updated $count files."
echo ""
echo "Modified files can now work with both:"
echo "  - Supabase Auth (when DB_MODE=supabase)"
echo "  - Passport.js Auth (when DB_MODE!=supabase)"
