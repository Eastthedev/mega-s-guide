const { Client } = require('pg');

async function main() {
  console.log("Initializing database connection...");
  
  // Connection details from direct connection string:
  // postgresql://postgres:cNG8y@JnY6SD@v3@db.oeltphtusjrvgcdtvnet.supabase.co:5432/postgres
  // We pass them as a configuration object to bypass URL parsing issues with '@' characters in password
  const client = new Client({
    host: '2a05:d014:14a4:4002:8af6:7d54:1f6a:9b37',
    port: 5432,
    user: 'postgres',
    password: 'cNG8y@JnY6SD@v3',
    database: 'postgres',
    ssl: { rejectUnauthorized: false } // Required for Supabase connections
  });

  try {
    await client.connect();
    console.log("Successfully connected to the Supabase database!");

    // 1. Create table for user stats
    console.log("Creating user_stats table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default_user',
        streak INT DEFAULT 0,
        total_sessions INT DEFAULT 0,
        last_visit VARCHAR(50),
        summaries_count INT DEFAULT 0,
        deck_finished BOOLEAN DEFAULT false,
        quiz_ace BOOLEAN DEFAULT false,
        quiz_pb INT DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default user row if not exists
    await client.query(`
      INSERT INTO user_stats (id, streak, total_sessions, last_visit, summaries_count, deck_finished, quiz_ace, quiz_pb)
      VALUES ('default_user', 0, 0, '', 0, false, false, 0)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Create table for note summaries
    console.log("Creating note_summaries table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_summaries (
        id VARCHAR(50) PRIMARY KEY,
        title TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        original_notes TEXT NOT NULL,
        style VARCHAR(50) NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create table for flashcard decks
    console.log("Creating flashcard_decks table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS flashcard_decks (
        id VARCHAR(50) PRIMARY KEY,
        title TEXT NOT NULL,
        cards JSONB NOT NULL,
        original_notes TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create table for quiz history
    console.log("Creating quiz_history table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id VARCHAR(50) PRIMARY KEY,
        score INT NOT NULL,
        total_questions INT NOT NULL,
        questions JSONB NOT NULL,
        original_notes TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create table for grounded chat history
    console.log("Creating chat_history table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default_chat',
        messages JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default row if not exists
    await client.query(`
      INSERT INTO chat_history (id, messages)
      VALUES ('default_chat', '[]'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Create table for research chat history
    console.log("Creating research_history table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_history (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default_research',
        messages JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default row if not exists
    await client.query(`
      INSERT INTO research_history (id, messages)
      VALUES ('default_research', '[]'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Disable RLS on all tables so client can perform queries anonymously
    console.log("Disabling Row Level Security on tables...");
    await client.query("ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE note_summaries DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE flashcard_decks DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE quiz_history DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;");
    await client.query("ALTER TABLE research_history DISABLE ROW LEVEL SECURITY;");

    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
