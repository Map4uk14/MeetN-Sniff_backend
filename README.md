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

Update `.env` with your MongoDB connection string and a strong `JWT_SECRET` with at least 32 characters.

Optional external API keys:

```env
OPENWEATHER_API_KEY=
DEFAULT_NEARBY_RADIUS_METERS=5000
```

The server starts without `OPENWEATHER_API_KEY`. The live weather endpoint returns a clear `503` error until the key is configured.

This backend does not use Google Geocoding. Park coordinates are stored directly as MongoDB GeoJSON Points, which avoids Google Cloud billing for backend geocoding. A Google Maps JavaScript API key belongs in the frontend, for example `VITE_GOOGLE_MAPS_API_KEY`, not in this backend.

## Run

Typical local flow:

```bash
npm install
cp .env.example .env
npm run test
npm run seed
npm start
```

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

```bash
npm run seed
```

Inserts demo users, Vienna parks and reviews. The script is idempotent for its demo records and uses the MongoDB connection from `.env`.

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
│   ├── services/
│   └── utils/
├── .env.example
├── package.json
└── package-lock.json
```

## Frontend/Backend Origin

The API is mounted under `/api`, so frontend and backend can share one origin in production through a reverse proxy or deployment platform. For local development, set `CORS_ORIGINS` in `.env` to the frontend dev server origin, for example `http://localhost:5173`.

For a Vite frontend, proxy `/api` to the Express server during development. Production can serve the frontend and proxy `/api` through the same domain.

## External APIs

- `GET /api/parks/:id/weather` uses OpenWeather.
- `POST /api/parks` requires direct MongoDB GeoJSON coordinates in the request body.
- `GET /api/parks/nearby` uses MongoDB GeoJSON search.
- `GET /api/parks`, `GET /api/parks/nearby` and `GET /api/parks/:idOrSlug` support XML with `format=xml` or `Accept: application/xml`.

## Security Defaults

- Security headers are enabled with Helmet.
- `/api` routes are rate-limited.
- Auth routes have stricter login/register limits.
- JWTs use HS256 with issuer/audience checks and a token version for logout/revocation.
- Production requires explicit non-localhost `CORS_ORIGINS`.

## License

ISC License - see LICENSE file for details.
