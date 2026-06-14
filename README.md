# MeetN-Sniff Backend

Node.js/Express backend for MeetN-Sniff with MongoDB, JWT authentication, park discovery, favorites, reviews, admin routes and external weather services.

- API documentation: [docs/API.md](docs/API.md)
- Backend requirement status: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB local, remote or reachable through an SSH tunnel

## Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your MongoDB connection string and a strong `JWT_SECRET` with at least 32 characters.

Relevant environment variables:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/meetn-sniff
JWT_SECRET=replace-this-with-a-long-random-secret-minimum-32-chars
JWT_EXPIRES_IN=1h
JWT_ISSUER=meetn-sniff-api
JWT_AUDIENCE=meetn-sniff-client
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
OPENWEATHER_API_KEY=
DEFAULT_NEARBY_RADIUS_METERS=5000
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OVERPASS_DEFAULT_RADIUS_METERS=3000
OVERPASS_MAX_RADIUS_METERS=10000
```

`OPENWEATHER_API_KEY` is optional at startup. The weather endpoint returns `503` until the key is configured.
OpenStreetMap Overpass does not require an API key. Discovery responses are cached briefly to reduce load on the public service.

Parks store coordinates directly as MongoDB GeoJSON Points in `[longitude, latitude]` order.

## Run

```bash
npm run test
npm run seed
npm run dev
```

Run without hot reload:

```bash
npm start
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Scripts

```bash
npm test
```

Runs a syntax check across backend source files.

```bash
npm run seed
```

Inserts demo users, Vienna parks and reviews. The script is idempotent for its known demo records and uses `MONGODB_URI` from `.env`.

Demo logins:

```text
admin@meetn-sniff.demo / MeetNSniffDemo123!
marlon@meetn-sniff.demo / MeetNSniffDemo123!
gamal@meetn-sniff.demo / MeetNSniffDemo123!
```

## Project Structure

```text
MeetN-Sniff_backend/
├── docs/
│   ├── API.md
│   └── REQUIREMENTS.md
├── index.js
├── scripts/
│   ├── check-syntax.js
│   └── seed.js
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

## Backend Features

- REST API mounted under `/api`
- JSON responses by default
- Optional XML for selected park GET endpoints through `?format=xml` or `Accept: application/xml`
- JWT register/login/logout/session checks
- Protected user, park, review and admin routes
- Account deletion with cleanup of owned parks, reviews and favorites
- MongoDB GeoJSON nearby search
- OpenStreetMap dog park discovery via `GET /api/parks/discover`
- Authenticated import of discovered dog parks into MongoDB
- OpenWeather current weather via `GET /api/parks/:id/weather`
- Open-Meteo forecast via `GET /api/parks/:id/forecast`
- Demo seed data for Vienna parks

## Security Defaults

- Helmet security headers
- CORS allow-list through `CORS_ORIGINS`
- API and auth rate limits
- JWT issuer/audience checks
- JWT token version invalidation on logout
- Password hashes are never returned in JSON/XML responses

## Notes

- No API keys are committed.
- Clients displaying OpenStreetMap discovery data must show the included OpenStreetMap attribution.
- If the database is reached through SSH tunneling, `MONGODB_URI` usually points to `127.0.0.1:<local-tunnel-port>`.

## License

ISC License - see LICENSE file for details.
