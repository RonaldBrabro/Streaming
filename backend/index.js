const express = require('express');
const cors = require('cors');
const cassandra = require('cassandra-driver');
const { client, connect, execute } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const Uuid = cassandra.types.Uuid;

app.use(cors());
app.use(express.json());

// Connect to Cassandra once at startup
connect().catch(err => {
  console.error('Cassandra connection failed, exiting.', err);
  process.exit(1);
});

// Helper to parse UUID or keep raw
function parseUuid(val) {
  if (!val) return null;
  try {
    return Uuid.fromString(val);
  } catch (e) {
    // Not a UUID string — return as-is (some tables might use text keys)
    return val;
  }
}

// Middleware: check if a user is banned from a channel
async function checkNotBanned(req, res, next) {
  try {
    const userId = req.header('x-user-id') || req.body.user_id;
    const channelId = req.body.channel_id || req.query.channelId || req.body.id_canal;

    if (!userId || !channelId) return next(); // Can't check bans without both

    const query = 'SELECT * FROM bans_by_channel WHERE channel_id = ? AND user_id = ? LIMIT 1';
    const result = await execute(query, [channelId, userId]);
    if (result.rowLength && result.rows.length > 0) {
      return res.status(403).json({ error: 'User is banned from this channel' });
    }
    next();
  } catch (err) {
    console.error('Error checking bans', err);
    next();
  }
}

// === API Routes ===

// GET /api/categories -> all categories
app.get('/api/categories', async (req, res) => {
  try {
    const query = 'SELECT id_categoria, nombre_categoria, descripcion FROM all_categories';
    const result = await execute(query, [], { prepare: true });
    res.json(result.rows.map(r => ({ id: r.id_categoria, name: r.nombre_categoria, description: r.descripcion })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// GET /api/home -> categories + streams for a popular category (fixed UUID for now)
app.get('/api/home', async (req, res) => {
  try {
    const POPULAR_CATEGORY = Uuid.fromString('11111111-1111-1111-1111-111111111111');

    const categoriesQuery = 'SELECT id_categoria, nombre_categoria FROM all_categories';
    const streamsQuery = 'SELECT id_stream, titulo, thumbnail_url, is_live, pico_viewers FROM streams_by_category WHERE id_categoria = ? LIMIT 50';

    const [catsResult, streamsResult] = await Promise.all([
      execute(categoriesQuery, [], { prepare: true }),
      execute(streamsQuery, [POPULAR_CATEGORY], { prepare: true })
    ]);

    const categories = catsResult.rows.map(r => ({ id: r.id_categoria, name: r.nombre_categoria }));
    const streams = streamsResult.rows.map(r => ({ id: r.id_stream, title: r.titulo, thumbnail: r.thumbnail_url, is_live: r.is_live, viewers: r.pico_viewers }));

    res.json({ categories, featuredStreams: streams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error building home' });
  }
});

// GET /api/streams?categoryId=... OR GET /api/streams/tag/:tag
app.get('/api/streams', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? parseUuid(req.query.categoryId) : null;
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });

    const q = 'SELECT id_stream, titulo, thumbnail_url, is_live, pico_viewers FROM streams_by_category WHERE id_categoria = ? LIMIT 100';
    const result = await execute(q, [categoryId], { prepare: true });
    res.json(result.rows.map(r => ({ id: r.id_stream, title: r.titulo, thumbnail: r.thumbnail_url, is_live: r.is_live, viewers: r.pico_viewers })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching streams' });
  }
});

app.get('/api/streams/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    const q = 'SELECT id_stream, titulo, thumbnail_url, is_live FROM streams_by_tag WHERE tag = ? LIMIT 100';
    const result = await execute(q, [tag], { prepare: true });
    res.json(result.rows.map(r => ({ id: r.id_stream, title: r.titulo, thumbnail: r.thumbnail_url, is_live: r.is_live })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching streams by tag' });
  }
});

// GET /api/channel/:id -> channel profile and whether current user follows it
app.get('/api/channel/:id', async (req, res) => {
  try {
    const channelUserId = parseUuid(req.params.id);
    const currentUser = req.header('x-user-id');

    const profileQ = 'SELECT id_usuario, id_canal, nombre_canal, biografia, total_followers, stream_key FROM channel_profiles WHERE id_usuario = ? LIMIT 1';
    const profileRes = await execute(profileQ, [channelUserId], { prepare: true });
    if (!profileRes.rowLength) return res.status(404).json({ error: 'Channel not found' });

    const p = profileRes.rows[0];
    const profile = { id_usuario: p.id_usuario, id_canal: p.id_canal, name: p.nombre_canal, bio: p.biografia, followers: p.total_followers, stream_key: p.stream_key };

    let follows = false;
    if (currentUser) {
      const followQ = 'SELECT channel_id FROM follows_by_user WHERE user_id = ? AND channel_id = ? LIMIT 1';
      const followRes = await execute(followQ, [currentUser, p.id_canal], { prepare: true });
      follows = followRes.rowLength && followRes.rows.length > 0;
    }

    res.json({ profile, follows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching channel' });
  }
});

// GET /api/chat/:streamId -> last 50 messages
app.get('/api/chat/:streamId', async (req, res) => {
  try {
    const streamId = parseUuid(req.params.streamId);
    const q = 'SELECT texto, nombre_usuario, color_usuario, timestamp FROM messages_by_stream WHERE id_stream = ? LIMIT 50';
    const result = await execute(q, [streamId], { prepare: true });
    res.json(result.rows.map(r => ({ text: r.texto, user: r.nombre_usuario, color: r.color_usuario, timestamp: r.timestamp })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching chat messages' });
  }
});

// POST /api/chat -> insert message (checks bans)
app.post('/api/chat', checkNotBanned, async (req, res) => {
  try {
    const { id_stream, channel_id, user_id, texto, nombre_usuario, color_usuario } = req.body;
    if (!id_stream || !user_id || !texto) return res.status(400).json({ error: 'id_stream, user_id and texto required' });

    const ts = new Date();
    const q = 'INSERT INTO messages_by_stream (id_stream, timestamp, texto, nombre_usuario, color_usuario, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    await execute(q, [id_stream, ts, texto, nombre_usuario, color_usuario, user_id], { prepare: true });

    res.status(201).json({ success: true, timestamp: ts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error inserting chat message' });
  }
});

// POST /api/monetization/donate -> insert donation
app.post('/api/monetization/donate', async (req, res) => {
  try {
    const { id_stream, user_id, amount, currency } = req.body;
    if (!id_stream || !user_id || !amount) return res.status(400).json({ error: 'id_stream, user_id and amount required' });

    const donationId = Uuid.random();
    const ts = new Date();

    const q = 'INSERT INTO donations_by_stream (id_stream, donation_id, user_id, amount, currency, timestamp) VALUES (?, ?, ?, ?, ?, ?)';
    await execute(q, [id_stream, donationId, user_id, amount, currency || 'bits', ts], { prepare: true });

    res.status(201).json({ success: true, donation_id: donationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing donation' });
  }
});

// POST /api/subscribe -> insert subscription
app.post('/api/subscribe', async (req, res) => {
  try {
    const { channel_id, user_id, tier } = req.body;
    if (!channel_id || !user_id || !tier) return res.status(400).json({ error: 'channel_id, user_id and tier required' });

    const ts = new Date();
    const q = 'INSERT INTO subscriptions_by_channel (channel_id, user_id, tier, start_timestamp) VALUES (?, ?, ?, ?)';
    await execute(q, [channel_id, user_id, tier, ts], { prepare: true });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error subscribing to channel' });
  }
});

// GET /api/me/follows -> channels followed by the current user
app.get('/api/me/follows', async (req, res) => {
  try {
    const userId = req.header('x-user-id') || req.query.userId;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const q = 'SELECT channel_id, followed_at FROM follows_by_user WHERE user_id = ? LIMIT 200';
    const result = await execute(q, [userId], { prepare: true });
    res.json(result.rows.map(r => ({ channel_id: r.channel_id, followed_at: r.followed_at })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching follows' });
  }
});

// GET /api/me/clips -> clips by user
app.get('/api/me/clips', async (req, res) => {
  try {
    const userId = req.header('x-user-id') || req.query.userId;
    if (!userId) return res.status(400).json({ error: 'x-user-id header required' });

    const q = 'SELECT clip_id, title, url, created_at FROM clips_by_user WHERE user_id = ? LIMIT 100';
    const result = await execute(q, [userId], { prepare: true });
    res.json(result.rows.map(r => ({ clip_id: r.clip_id, title: r.title, url: r.url, created_at: r.created_at })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching clips' });
  }
});

// Lightweight health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
