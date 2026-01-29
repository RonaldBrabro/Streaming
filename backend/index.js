const express = require('express');
const cors = require('cors');
const { client, connect } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Connect to Cassandra once at startup
connect().catch(err => {
  console.error('Cassandra connection failed, exiting.', err);
  process.exit(1);
});

// GET /api/videos -> list videos
app.get('/api/videos', async (req, res) => {
  try {
    const query = 'SELECT video_id, title, url, description FROM videos';
    const result = await client.execute(query);
    const videos = result.rows.map(r => ({
      video_id: r.video_id,
      title: r.title,
      url: r.url,
      description: r.description
    }));
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching videos' });
  }
});

// GET /api/videos/:id/comments -> comments by video
app.get('/api/videos/:id/comments', async (req, res) => {
  try {
    const videoId = req.params.id;
    // IMPORTANT: comments_by_video table must have partition key video_id and clustering key posted_timestamp DESC
    const query = 'SELECT video_id, author, content, posted_timestamp FROM comments_by_video WHERE video_id = ? LIMIT 200';
    const result = await client.execute(query, [videoId], { prepare: true });
    const comments = result.rows.map(r => ({
      video_id: r.video_id,
      author: r.author,
      content: r.content,
      posted_timestamp: r.posted_timestamp
    }));
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

// POST /api/comments -> insert a comment
app.post('/api/comments', async (req, res) => {
  try {
    const { video_id, author, content, posted_timestamp } = req.body;
    if (!video_id || !author || !content) {
      return res.status(400).json({ error: 'video_id, author and content are required' });
    }

    // If not provided, set current time
    const ts = posted_timestamp ? new Date(posted_timestamp) : new Date();

    // NOTE: This assumes comments_by_video has columns: video_id, posted_timestamp, author, content (adjust if your schema is different)
    const query = 'INSERT INTO comments_by_video (video_id, posted_timestamp, author, content) VALUES (?, ?, ?, ?)';
    await client.execute(query, [video_id, ts, author, content], { prepare: true });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error inserting comment' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});
