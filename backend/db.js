const cassandra = require('cassandra-driver');

// Contact points grouped by datacenter
const EAST_CONTACTS = ['10.245.166.101', '10.245.166.105', '10.245.166.107'];
const WEST_CONTACTS = ['10.245.166.103', '10.245.166.104', '10.245.166.106'];
const contactPoints = [...EAST_CONTACTS, ...WEST_CONTACTS];

// Plain text auth (use if your cluster requires it)
const authProvider = new cassandra.auth.PlainTextAuthProvider('cassandra', 'cassandra');

// Use DCAwareRoundRobinPolicy and set local DC to 'EAST'
const loadBalancingPolicy = new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy('EAST');

const client = new cassandra.Client({
  contactPoints,
  localDataCenter: 'EAST',
  keyspace: 'twitch_app',
  authProvider,
  policies: { loadBalancing: loadBalancingPolicy },
  // Optionally tune pooling / socket options here
});

async function connect() {
  try {
    await client.connect();
    console.log('✅ Cassandra connected (keyspace=twitch_app, localDC=EAST)');
  } catch (err) {
    console.error('❌ Error connecting to Cassandra', err);
    throw err;
  }
}

// Convenience helper to execute prepared queries
async function execute(query, params = [], options = {}) {
  return client.execute(query, params, { prepare: true, ...options });
}

module.exports = { client, connect, execute };
