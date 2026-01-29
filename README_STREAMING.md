Guía rápida - Streaming App (Node.js + Angular + Cassandra)

Estructura clave:

- backend/
  - `db.js` -> configuración del cliente Cassandra
  - `index.js` -> servidor Express con las rutas API
  - `package.json` -> script `start` y `dev`

- frontend/
  - `src/app/services/video.service.ts` -> cliente HTTP hacia `/api`
  - `src/app/components/video-player/*` -> componente que muestra video y comentarios
  - `proxy.conf.json` -> proxy para desarrollo (redirige `/api` a `http://localhost:4000`)

Cómo ejecutar en desarrollo:
1. Backend:
   - `cd backend`
   - `npm install` (instalar dependencias)
   - `npm run start` (o `npm run dev` tras instalar `nodemon`)

2. Frontend:
   - `cd frontend`
   - `npm install`
   - `ng serve --proxy-config proxy.conf.json`

Notas importantes:
- Cassandra: `db.js` usa `contactPoints: ['10.10.10.101','10.10.10.102']`, `localDataCenter: 'east-side'` y autenticación `sysadmin/StrongPassword123!`.
- Asegúrate que `comments_by_video` tenga columnas `video_id`, `posted_timestamp` (timestamp), `author`, `content`.
- En producción, mueve credenciales fuera del código fuente (variables de entorno / secret store).

Si quieres, puedo:
- Añadir validaciones y tipos más estrictos en el backend
- Preparar pruebas unitarias y e2e
- Crear Dockerfile / docker-compose para entorno local con un nodo Cassandra de prueba
