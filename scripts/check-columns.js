const https = require('https');

const ANON_KEY = 'sb_publishable_V1oKc4RKQ_0wsGkuESpiuA_U77pH80j';

const options = {
  hostname: 'oeltphtusjrvgcdtvnet.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Origin': 'http://localhost:3000',
  }
};

const req = https.request(options, r => {
  let data = '';
  r.on('data', d => data += d);
  r.on('end', () => {
    try {
      const schema = JSON.parse(data);
      console.log('--- Database Schema Definitions ---');
      const definitions = schema.definitions;
      if (!definitions) {
        console.log('No definitions found in schema response.');
        console.log('Keys in response:', Object.keys(schema));
        return;
      }

      for (const tableName of Object.keys(definitions)) {
        console.log(`\nTable: ${tableName}`);
        const columns = definitions[tableName].properties;
        for (const colName of Object.keys(columns)) {
          const colInfo = columns[colName];
          console.log(`  - ${colName} (${colInfo.type}${colInfo.format ? ', ' + colInfo.format : ''})`);
        }
      }
    } catch (err) {
      console.error('Failed to parse schema response:', err.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', e => {
  console.error('Request error:', e.message);
});

req.end();
