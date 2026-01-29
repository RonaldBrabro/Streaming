Backend for Streaming App

- Start: `node index.js` (listens on port 4000 by default)
- The Cassandra client is configured in `db.js` with:
  - contactPoints: 10.10.10.101, 10.10.10.102 (add the 3rd node IP here if you have it; include all cluster nodes for resiliency)
  - localDataCenter: 'east-side'
  - keyspace: 'streaming_app'
  - auth: sysadmin / StrongPassword123!

Routes:
- GET /api/videos
  - Response: [{ video_id, title, url, description }, ...]
- GET /api/videos/:id/comments
  - Response: [{ video_id, author, content, posted_timestamp }, ...]
- POST /api/comments  { video_id, author, content, posted_timestamp? }
  - Example body:
    {
      "video_id": "<video-id>",
      "author": "Alumno",
      "content": "Muy buen video!"
    }

Security note: Move credentials into env vars for production.

Developer tips:
- To enable hot reload during development, install nodemon: `npm i -D nodemon` and then use `npm run dev`.
- The example assumes the `comments_by_video` table contains columns: `video_id`, `posted_timestamp` (timestamp), `author`, `content`. Adjust queries if your schema differs.
