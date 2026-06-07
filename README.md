# EncryptedChat

MVP web chat system with client-side end-to-end encryption.

## Stack

- Frontend: React, TypeScript, Vite, Ant Design, Socket.IO client
- Backend: NestJS, Socket.IO, Prisma
- Database: PostgreSQL
- File storage: local encrypted blob uploads

## Quick Start

```bash
npm install
npm run dev
```

`npm run dev` starts PostgreSQL, the NestJS API, and the React web app with Docker Compose.

Default local ports:

- Web: `http://localhost:38081`
- API: `http://localhost:38080`
- PostgreSQL host port: `35432`

Useful commands:

```bash
npm run dev:detached
npm run dev:down
```

For local source-code development without Dockerized Node services, copy the env examples first:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
docker compose up -d postgres
npm run prisma:migrate
npm run dev:local
```

## Ubuntu Deployment

Install Docker and Docker Compose plugin on the server, copy the project to the server, then run:

```bash
cp apps/api/.env.example apps/api/.env
JWT_SECRET="replace-with-a-long-random-production-secret" docker compose up --build -d
```

For a public domain, put Nginx/Caddy/Traefik in front of `web` port `38081` and enable HTTPS. The web container proxies `/api` and Socket.IO `/socket.io` to the API container internally, so the browser can use one origin.

You can override host ports without editing YAML:

```bash
WEB_HOST_PORT=18081 API_HOST_PORT=18080 POSTGRES_HOST_PORT=15432 docker compose up --build -d
```

## Security Boundary

The server stores account metadata, public keys, friendship/group relationships, and encrypted image blobs. It does not store message history or plaintext chat/image content. Private keys are generated and encrypted in the browser, then stored in IndexedDB.
