const cassandra = require('cassandra-driver');

// Authentication (hardening applied)
const authProvider = new cassandra.auth.PlainTextAuthProvider('sysadmin', 'StrongPassword123!');

// DCAwareRoundRobinPolicy with local DC 'east-side'
const loadBalancingPolicy = new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy('east-side');

const client = new cassandra.Client({
  contactPoints: ['10.10.10.101', '10.10.10.102'],
  localDataCenter: 'east-side',
  keyspace: 'streaming_app',
  authProvider,
  policies: { loadBalancing: loadBalancingPolicy },
  // Optionally tune pooling / socket options here
});

async function connect() {
  try {
    await client.connect();
    console.log('✅ Cassandra connected (keyspace=streaming_app, localDC=east-side)');
  } catch (err) {
    console.error('❌ Error connecting to Cassandra', err);
    throw err;
  }
}

module.exports = { client, connect };
