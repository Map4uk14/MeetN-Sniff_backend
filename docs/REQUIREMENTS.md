# MeetN-Sniff Backend Requirements

This file documents the official project requirements from the backend perspective.

The frontend requirements are listed separately so the backend repository does not claim ownership of work that belongs to the frontend component.

## Backend Scope

| Requirement | Backend Status | Backend Evidence |
|---|---|---|
| M1: Backend must be an individual component | Done | This repository is a standalone Express/MongoDB backend with its own `package.json`, `index.js`, `src/app.js`, `npm start` and `npm run start:prod`. |
| M3: FE/BE communication over HTTP(S) | Done | Backend exposes HTTP endpoints under `/api` in `src/app.js`; CORS is configured in `src/config/cors.js`. |
| M5: BE endpoints return JSON or XML | Done | JSON is the default. XML is supported for `GET /api/parks`, `GET /api/parks/:idOrSlug` and `GET /api/parks/nearby` via `src/utils/responseFormat.js`. |
| M6: BE manages resources with GET, POST, PUT and DELETE | Done | Parks resource supports `GET /api/parks`, `POST /api/parks`, `PUT /api/parks/:id` and `DELETE /api/parks/:id` in `src/routes/parks.js`. |
| M8: System consumes at least one external REST service | Done | `GET /api/parks/:id/weather` calls OpenWeather through `src/services/weatherService.js`. |
| M9: Session management | Done | JWT register/login/logout/session handling is implemented in `src/routes/auth.js` and `src/middleware/auth.js`. Protected routes require `Authorization: Bearer <token>`. |
| S1: At least two external REST services | Done | OpenWeather is used by `src/services/weatherService.js`; Open-Meteo Forecast is used by `src/services/openMeteoService.js`. |

## Frontend Scope

These requirements depend on the separate frontend repository and are not implemented or committed from this backend repository.

| Requirement | Backend Status | Frontend Responsibility |
|---|---|---|
| M2: Frontend must be an individual component | Out of backend scope | Separate frontend repository must provide its own `package.json`, HTML/CSS/JS and start command. |
| M4: AJAX/asynchronous data transfer | Out of backend scope | Frontend must call backend asynchronously with `fetch`, Axios or equivalent. |
| M7: Frontend consumes GET, POST, PUT and DELETE | Out of backend scope | Frontend must actually call backend endpoints with each method. |
| S2: Second FE component using at least three BE endpoints | Out of backend scope | Frontend should provide this component/view. |
| S3: W3C-compliant frontend | Out of backend scope | Frontend HTML should be validated with https://validator.w3.org/. |
| S4: Responsive frontend | Out of backend scope | Frontend CSS/layout must provide mobile and desktop views. |

## Backend Endpoint Evidence

| Requirement Area | Endpoint or File |
|---|---|
| Health | `GET /api/health` in `src/app.js` |
| Auth/JWT | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| JSON | All endpoints return JSON by default |
| XML | `GET /api/parks?format=xml`, `GET /api/parks/:idOrSlug?format=xml`, `GET /api/parks/nearby?format=xml` |
| GET resource | `GET /api/parks` |
| POST resource | `POST /api/parks` |
| PUT resource | `PUT /api/parks/:id` |
| DELETE resource | `DELETE /api/parks/:id` |
| External REST #1 | `GET /api/parks/:id/weather` uses OpenWeather |
| External REST #2 | `GET /api/parks/:id/forecast` uses Open-Meteo |
| Admin | `/api/admin/*` routes in `src/routes/admin.js` |
| Demo data | `npm run seed` via `scripts/seed.js` |

## Backend Notes

- Parks store coordinates directly as MongoDB GeoJSON Points in `[longitude, latitude]` order.
- `OPENWEATHER_API_KEY` is optional at startup; only the live weather endpoint requires it.
- Open-Meteo does not require an API key.
- Password hashes are excluded from API responses.
