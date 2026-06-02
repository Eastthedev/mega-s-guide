const { Client } = require('pg');

const hosts = [
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-2.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-east-2.pooler.supabase.com'
];

async function test() {
  for (const host of hosts) {
    console.log(`Trying session pooler (port 5432) on: ${host}...`);
    const client = new Client({
      host: host,
      port: 5432,
      user: 'postgres.oeltphtusjrvgcdtvnet',
      password: 'cNG8y@JnY6SD@v3',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`SUCCESS: Connected to ${host} on port 5432!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`FAILED: ${host} - ${err.message} (code: ${err.code || 'none'})`);
    }
  }
}

test();
