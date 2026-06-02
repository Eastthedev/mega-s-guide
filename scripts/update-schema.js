const { Client } = require('pg');

async function main() {
  console.log("Connecting to the database via IPv6 address...");
  
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
    console.log("Connected successfully to Supabase! Executing schema upgrades...");

    // 1. Create chat_sessions table
    console.log("Creating chat_sessions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        messages JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create research_sessions table
    console.log("Creating research_sessions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_sessions (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        messages JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Enable RLS
    console.log("Enabling Row Level Security on sessions tables...");
    await client.query("ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;");

    // 4. Create RLS policies
    console.log("Creating RLS policies...");
    await client.query(`
      DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON chat_sessions;
      CREATE POLICY "Users can manage their own chat sessions" ON chat_sessions 
          FOR ALL TO authenticated 
          USING (auth.uid() = user_id) 
          WITH CHECK (auth.uid() = user_id);
    `);

    await client.query(`
      DROP POLICY IF EXISTS "Users can manage their own research sessions" ON research_sessions;
      CREATE POLICY "Users can manage their own research sessions" ON research_sessions 
          FOR ALL TO authenticated 
          USING (auth.uid() = user_id) 
          WITH CHECK (auth.uid() = user_id);
    `);

    console.log("Schema upgrades completed successfully!");
  } catch (err) {
    console.error("Schema upgrade failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
