# MeetN-Sniff Backend

Node.js/Express backend for MeetN-Sniff with MongoDB, JWT authentication, park discovery, favorites and reviews.

**Pinned API documentation:** [docs/API.md](docs/API.md)

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB local or cloud instance

## Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your MongoDB connection string and a strong `JWT_SECRET`.

## Run

Development with hot reload:

```bash
npm start
```

Production:

```bash
npm run start:prod
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Scripts

```bash
npm test
```

Runs a syntax check across the backend source files.

## Project Structure

```text
MeetN-Sniff_backend/
├── docs/API.md
├── index.js
├── scripts/check-syntax.js
├── src/
│   ├── app.js
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── .env.example
├── package.json
└── package-lock.json
```

## Frontend/Backend Origin

The API is mounted under `/api`, so frontend and backend can share one origin in production through a reverse proxy or deployment platform. For local development, set `CORS_ORIGINS` in `.env` to the frontend dev server origin, for example `http://localhost:5173`.

## License

ISC License - see LICENSE file for details.
