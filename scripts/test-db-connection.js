/**
 * CareConnect Ethiopia - Safe Database Connectivity Verification Script
 * Safely tests PostgreSQL / Neon connection without exposing credentials or secrets.
 */

import { testConnection, sanitizeConnectionString } from '../database/connection.js';

async function run() {
  console.log('\n============================================================');
  console.log('   CARECONNECT ETHIOPIA - DATABASE CONNECTIVITY TEST');
  console.log('============================================================\n');

  try {
    const res = await testConnection();
    if (res.connected) {
      console.log('  ✔ Connection Status : SUCCESS (ONLINE)');
      console.log(`  ✔ Provider          : ${res.provider}`);
      console.log(`  ✔ Database Name     : ${res.database}`);
      console.log(`  ✔ Server Timestamp  : ${res.timestamp}`);
      console.log(`  ✔ SSL Enabled       : ${res.ssl}`);
    } else {
      console.log('  ℹ Connection Status : OFFLINE / NOT CONFIGURED');
      console.log(`  ℹ Error Summary     : ${res.error}`);
      console.log(`  ℹ Host Target       : ${res.config.host}:${res.config.port}`);
      console.log(`  ℹ Database Target   : ${res.config.database}`);
      console.log(`  ℹ SSL Configured    : ${res.ssl}`);
      console.log('  ℹ Note: This is normal in local development if PostgreSQL / Neon DATABASE_URL is not yet configured.');
    }
  } catch (err) {
    console.log(`  ✖ Unexpected error: ${sanitizeConnectionString(err.message)}`);
  }

  console.log('\n============================================================\n');
  process.exit(0);
}

run();
