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
  console.error('Cassandra connection failed, but continuing in development mode.', err);
  // Do not exit, allow server to run with mock data
});

// GET /api/videos -> keep compatibility with frontend that expects /api/videos
app.get('/api/videos', async (req, res) => {
  try {
    const q = 'SELECT id_stream, titulo, thumbnail_url, nombre_streamer, is_live, pico_viewers FROM streams_by_category ALLOW FILTERING';
    const result = await execute(q, [], { prepare: true });
    const videos = result.rows.map(r => ({
      video_id: r.id_stream,
      title: r.titulo,
      url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: r.thumbnail_url,
      streamer: r.nombre_streamer,
      viewers: r.pico_viewers,
      isLive: r.is_live,
      description: '' // Placeholder, as it's not in the new schema
    }));
    return res.json(videos);
  } catch (err) {
    console.error('Error fetching videos from Cassandra', err);
    // If Cassandra is not available, return mock data for development
    if (err.message && (err.message.includes('All host(s) tried for query failed') || err.message.includes('ECONNREFUSED') || err.message.includes('does not exist'))) {
      console.log('Returning mock data since Cassandra is not available');
      const mockVideos = [
        {
          video_id: 'mock-1',
          title: 'Mock Stream 1',
          url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://via.placeholder.com/300x200?text=Mock+Thumbnail',
          streamer: 'MockStreamer1',
          viewers: 1500,
          isLive: true,
          description: 'Mock streaming content'
        },
        {
          video_id: 'mock-2',
          title: 'Mock Stream 2',
          url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://via.placeholder.com/300x200?text=Mock+Thumbnail+2',
          streamer: 'MockStreamer2',
          viewers: 800,
          isLive: false,
          description: 'Another mock stream'
        }
      ];
      return res.json(mockVideos);
    }
    return res.status(500).json({ error: 'Error fetching videos' });
  }
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
    console.error('Error fetching home data', err);
    // Mock data if Cassandra not available
    if (err.message && (err.message.includes('All host(s) tried for query failed') || err.message.includes('ECONNREFUSED') || err.message.includes('does not exist'))) {
      console.log('Returning mock home data');
      const mockCategories = [
        { id: 'cat1', name: 'Gaming' },
        { id: 'cat2', name: 'Music' },
        { id: 'cat3', name: 'Talk Shows' }
      ];
      const mockStreams = [
        { id: 'stream1', title: 'Epic Game Stream', thumbnail: 'https://via.placeholder.com/300x200?text=Game+Stream', is_live: true, viewers: 1500 },
        { id: 'stream2', title: 'Music Session', thumbnail: 'https://via.placeholder.com/300x200?text=Music', is_live: true, viewers: 800 }
      ];
      return res.json({ categories: mockCategories, featuredStreams: mockStreams });
    }
    return res.status(500).json({ error: 'Error building home' });
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

// POST /api/register -> insert user
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, region, avatar_url, nickname } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const id_usuario = Uuid.random();
    const q = 'INSERT INTO users_by_email (email, id_usuario, password, nickname, avatar_url, region) VALUES (?, ?, ?, ?, ?, ?)';
    await execute(q, [email, id_usuario, password, nickname || '', avatar_url || '', region || 'unknown'], { prepare: true });

    res.status(201).json({ success: true, id_usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// POST /api/login -> check user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const q = 'SELECT id_usuario, password, nickname, avatar_url, region FROM users_by_email WHERE email = ? LIMIT 1';
    const result = await execute(q, [email], { prepare: true });
    if (!result.rowLength) return res.status(401).json({ error: 'User not found' });

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: 'Invalid password' });

    res.json({ id_usuario: user.id_usuario, nickname: user.nickname, avatar_url: user.avatar_url, region: user.region });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// POST /api/channel -> create channel profile
app.post('/api/channel', async (req, res) => {
  try {
    const { id_usuario, nombre_canal, biografia, stream_key } = req.body;
    if (!id_usuario || !nombre_canal) return res.status(400).json({ error: 'id_usuario and nombre_canal required' });

    const id_canal = Uuid.random();
    const q = 'INSERT INTO channel_profiles (id_usuario, id_canal, nombre_canal, biografia, total_followers, stream_key) VALUES (?, ?, ?, ?, 0, ?)';
    await execute(q, [id_usuario, id_canal, nombre_canal, biografia || '', stream_key || ''], { prepare: true });

    res.status(201).json({ success: true, id_canal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating channel' });
  }
});

// POST /api/stream -> create stream
app.post('/api/stream', async (req, res) => {
  try {
    const { titulo, id_categoria, thumbnail_url, nombre_streamer } = req.body;
    if (!titulo || !id_categoria) return res.status(400).json({ error: 'titulo and id_categoria required' });

    const id_stream = Uuid.random();
    const fecha_inicio = new Date();
    const q = 'INSERT INTO streams_by_category (id_categoria, pico_viewers, id_stream, titulo, thumbnail_url, is_live) VALUES (?, 0, ?, ?, ?, true)';
    await execute(q, [id_categoria, id_stream, titulo, thumbnail_url || '', true], { prepare: true });

    res.status(201).json({ success: true, id_stream });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating stream' });
  }
});

// POST /api/follow -> follow channel
app.post('/api/follow', async (req, res) => {
  try {
    const { user_id, channel_id } = req.body;
    if (!user_id || !channel_id) return res.status(400).json({ error: 'user_id and channel_id required' });

    const ts = new Date();
    const q = 'INSERT INTO follows_by_user (user_id, channel_id, followed_at) VALUES (?, ?, ?)';
    await execute(q, [user_id, channel_id, ts], { prepare: true });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error following channel' });
  }
});

// POST /api/clip -> create clip
app.post('/api/clip', async (req, res) => {
  try {
    const { user_id, titulo, url_video, duracion } = req.body;
    if (!user_id || !titulo || !url_video) return res.status(400).json({ error: 'user_id, titulo and url_video required' });

    const id_clip = Uuid.random();
    const created_at = new Date();
    const q = 'INSERT INTO clips_by_user (user_id, clip_id, title, url, created_at) VALUES (?, ?, ?, ?, ?)';
    await execute(q, [user_id, id_clip, titulo, url_video, created_at], { prepare: true });

    res.status(201).json({ success: true, id_clip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating clip' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
