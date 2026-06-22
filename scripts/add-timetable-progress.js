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
    console.log('Connected! Adding timetable_progress column to user_stats...');

    await client.query(`
      ALTER TABLE user_stats 
      ADD COLUMN IF NOT EXISTS timetable_progress JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('  ✓ Column timetable_progress added successfully to user_stats');

    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
