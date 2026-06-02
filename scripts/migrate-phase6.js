const { Client } = require('pg');

async function main() {
  console.log('Connecting to Supabase...');

  const client = new Client({
    host: '2a05:d014:14a4:4002:8af6:7d54:1f6a:9b37',
    port: 5432,
    user: 'postgres',
    password: 'cNG8y@JnY6SD@v3',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Running Phase 6 migration...');

    // Create explanation_history table
    console.log('Creating explanation_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS explanation_history (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        mode VARCHAR(20) NOT NULL,
        depth VARCHAR(20) NOT NULL,
        input TEXT NOT NULL,
        explanation_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ explanation_history table created');

    // Enable RLS
    console.log('Enabling Row Level Security...');
    await client.query('ALTER TABLE explanation_history ENABLE ROW LEVEL SECURITY;');
    console.log('  ✓ RLS enabled on explanation_history');

    // Create RLS policy
    console.log('Creating RLS policy...');
    await client.query(`
      DROP POLICY IF EXISTS "Users can manage their own explanations" ON explanation_history;
      CREATE POLICY "Users can manage their own explanations" ON explanation_history 
        FOR ALL TO authenticated 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
    `);
    console.log('  ✓ RLS policy set for explanation_history');

    console.log('\nPhase 6 migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
