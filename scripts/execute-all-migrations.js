#!/usr/bin/env node

/**
 * Execute all Supabase SQL migrations
 * Usage: node scripts/execute-all-migrations.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://lcsidczjexcfxajuoaiw.supabase.co';
const SUPABASE_ACCESS_TOKEN = 'sbp_b7581135f7c85dd27510e2b5e41da14ee73ae19e';
const PROJECT_REF = 'lcsidczjexcfxajuoaiw';

// Migration files directory
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

/**
 * Execute SQL on Supabase using REST API
 */
async function executeSQL(sql, migrationName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'apikey': SUPABASE_ACCESS_TOKEN,
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${migrationName} - SUCCESS`);
          resolve(body);
        } else {
          console.error(`❌ ${migrationName} - FAILED (${res.statusCode})`);
          console.error(`Response: ${body}`);
          reject(new Error(`Migration failed: ${migrationName}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${migrationName} - ERROR:`, error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Execute SQL directly via postgres connection string
 * (Alternative method using direct SQL execution)
 */
async function executeSQLDirect(sql, migrationName) {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ACCESS_TOKEN);
  
  try {
    // Note: This uses the Supabase client which may have limitations
    // For complex migrations, use the Supabase CLI or dashboard
    console.log(`⚙️  Executing ${migrationName}...`);
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error in ${migrationName}:`, error);
          throw error;
        }
      }
    }
    
    console.log(`✅ ${migrationName} - SUCCESS`);
  } catch (error) {
    console.error(`❌ ${migrationName} - FAILED:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}\n`);

  // Get all SQL files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sort to ensure order

  if (files.length === 0) {
    console.log('❌ No migration files found!');
    return;
  }

  console.log(`Found ${files.length} migration file(s):\n`);
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}`);
  });
  console.log('\n');

  // Execute migrations one by one
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(MIGRATIONS_DIR, file);
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 [${i + 1}/${files.length}] ${file}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Note: Since we can't execute arbitrary SQL via REST API easily,
      // we need to use Supabase CLI or dashboard
      console.log(`📝 SQL file read successfully (${sql.length} characters)`);
      console.log(`⚠️  Please execute this migration manually in Supabase Dashboard:`);
      console.log(`    https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
      
      // Show first 500 characters as preview
      const preview = sql.substring(0, 500);
      console.log('📄 Preview:');
      console.log('────────────────────────────────────────');
      console.log(preview);
      if (sql.length > 500) {
        console.log(`... (${sql.length - 500} more characters)`);
      }
      console.log('────────────────────────────────────────\n');
      
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All migrations processed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Next Steps:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw/sql/new');
  console.log('   2. Copy/paste each migration SQL file content');
  console.log('   3. Click "Run" for each migration');
  console.log('   4. Verify tables are created in the Table Editor\n');
  
  console.log('💡 Tip: Migrations should be executed in order:');
  files.forEach((f, i) => {
    console.log(`   ${i + 1}. ${f}`);
  });
  console.log('');
}

// Run migrations
runMigrations().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});


