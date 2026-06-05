# MeetN-Sniff API

Pinned source of truth for the backend API.

## Base URL

Development default:

```text
http://localhost:3000/api
```

All routes are mounted below `/api` so the frontend and backend can be served from the same origin in production, for example:

```text
https://meetn-sniff.example.com/api/parks
```

During local development, run the frontend on its own dev port and either:

- proxy `/api` to `http://localhost:3000` from the frontend dev server, or
- set `CORS_ORIGINS` to the frontend origin, for example `http://localhost:5173`.

Two separate processes cannot bind the exact same host and port at the same time. The same-origin setup is achieved by mounting backend routes under `/api` behind one frontend/proxy origin.

## Environment

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/meetn-sniff
JWT_SECRET=replace-this-with-a-long-random-secret-minimum-32-chars
JWT_EXPIRES_IN=1h
JWT_ISSUER=meetn-sniff-api
JWT_AUDIENCE=meetn-sniff-client
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
TRUST_PROXY=0
API_RATE_LIMIT=300
AUTH_RATE_LIMIT=30
LOGIN_RATE_LIMIT=5
REGISTER_RATE_LIMIT=10
OPENWEATHER_API_KEY=
DEFAULT_NEARBY_RADIUS_METERS=5000
```

`CORS_ORIGINS` is comma-separated. Requests with no `Origin` header are allowed for same-origin requests, cURL, server-to-server calls and mobile clients.

Security notes:

- `JWT_SECRET` must be at least `32` characters long.
- JWTs use `HS256` with configured issuer and audience checks.
- `JWT_EXPIRES_IN` defaults to `1h`.
- In production, `CORS_ORIGINS` is required and must not use localhost origins.
- Set `TRUST_PROXY=1` when the API runs behind one trusted reverse proxy or deployment proxy.
- Rate limits default to `300` API requests per 15 minutes, `30` auth requests per 15 minutes, `5` login attempts per 15 minutes and `10` registrations per hour.
- `OPENWEATHER_API_KEY` is optional at server startup. The weather endpoint returns `503` when the key is missing.
- `DEFAULT_NEARBY_RADIUS_METERS` defaults to `5000` for nearby park searches.

## Authentication

JWT bearer token:

```http
Authorization: Bearer <token>
```

Tokens are returned by `POST /auth/register` and `POST /auth/login`.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data failed validation",
    "details": [
      {
        "field": "email",
        "message": "Email must be valid"
      }
    ]
  }
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid request payload, id or query |
| `401` | Missing, expired or invalid token |
| `403` | Authenticated but not allowed |
| `404` | Resource not found |
| `409` | Duplicate unique value |
| `429` | Rate limit exceeded |
| `500` | Server configuration/runtime error |

## Response Formats

JSON is the default response format.

These park endpoints can also return XML:

- `GET /parks`
- `GET /parks/nearby`
- `GET /parks/:idOrSlug`

Use either:

```http
GET /api/parks?format=xml
Accept: application/xml
```

XML responses use `Content-Type: application/xml`.

## Data Models

### User

```json
{
  "id": "ObjectId",
  "username": "mika",
  "email": "mika@example.com",
  "displayName": "Mika",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "Weekend park explorer.",
  "dog": {
    "name": "Nala",
    "breed": "Labrador",
    "size": "medium",
    "birthYear": 2021,
    "temperament": ["friendly", "playful"]
  },
  "favoriteParks": ["ObjectId"],
  "role": "user",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

Notes:

- `email` and `username` are unique.
- `email` is returned for auth/current-user responses, not public profiles.
- `passwordHash` is never returned.
- `role` is `user` or `admin`.
- `dog.size` is `small`, `medium`, `large` or `giant`.

### Park

```json
{
  "id": "ObjectId",
  "name": "Volkspark Friedrichshain",
  "slug": "volkspark-friedrichshain",
  "description": "Large city park with open fields.",
  "address": {
    "street": "Am Friedrichshain",
    "city": "Berlin",
    "postalCode": "10407",
    "country": "Germany"
  },
  "location": {
    "type": "Point",
    "coordinates": [13.4376, 52.5287]
  },
  "tags": ["off-leash", "shady", "busy"],
  "amenities": ["water", "benches", "waste-bags"],
  "rules": {
    "leashRequired": false,
    "fenced": false,
    "dogWasteBags": true
  },
  "photos": ["https://example.com/park.jpg"],
  "ratingSummary": {
    "averageRating": 4.5,
    "reviewCount": 12
  },
  "createdBy": "ObjectId",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

Notes:

- `location.coordinates` uses GeoJSON order: `[longitude, latitude]`.
- `tags` and `amenities` are normalized to lowercase and de-duplicated.
- `slug` is generated from `name` if it is not provided.

### Review

```json
{
  "id": "ObjectId",
  "park": "ObjectId",
  "user": "ObjectId",
  "rating": 5,
  "title": "Great for social dogs",
  "body": "Lots of space and friendly people.",
  "visitDate": "2026-05-17T00:00:00.000Z",
  "tags": ["friendly", "clean"],
  "dogFriendliness": 5,
  "cleanliness": 4,
  "crowdLevel": 3,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

Notes:

- `rating`, `dogFriendliness`, `cleanliness` and `crowdLevel` use `1` to `5`.
- One user can create one review per park.
- Creating, updating or deleting a review recalculates `park.ratingSummary`.

## Endpoints

### Health

#### GET `/health`

Response `200`:

```json
{
  "status": "ok",
  "service": "meetn-sniff-api",
  "timestamp": "2026-05-17T18:00:00.000Z"
}
```

### Auth

#### POST `/auth/register`

Creates a user and returns a JWT.

Request:

```json
{
  "username": "mika",
  "email": "mika@example.com",
  "password": "supersecret",
  "displayName": "Mika",
  "dog": {
    "name": "Nala",
    "breed": "Labrador",
    "size": "medium",
    "birthYear": 2021,
    "temperament": ["friendly", "playful"]
  }
}
```

Response `201`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "ObjectId",
    "username": "mika",
    "email": "mika@example.com"
  }
}
```

#### POST `/auth/login`

Request:

```json
{
  "email": "mika@example.com",
  "password": "supersecret"
}
```

Response `200`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "ObjectId",
    "username": "mika",
    "email": "mika@example.com"
  }
}
```

#### GET `/auth/me`

Requires auth. Returns the current authenticated user.

#### POST `/auth/logout`

Requires auth. Revokes the current user's existing JWTs by incrementing the user's token version.

Response `204`.

### Users

#### GET `/users/me`

Requires auth. Returns the current authenticated user.

#### PATCH `/users/me`

Requires auth. Updates the current user's editable profile fields.

Editable fields:

- `displayName`
- `avatarUrl`
- `bio`
- `dog`

Request:

```json
{
  "displayName": "Mika and Nala",
  "bio": "Always looking for good dog parks.",
  "dog": {
    "name": "Nala",
    "breed": "Labrador",
    "size": "medium",
    "birthYear": 2021,
    "temperament": ["friendly", "playful"]
  }
}
```

#### GET `/users/me/favorites`

Requires auth. Returns the current user's favorite parks.

#### POST `/users/me/favorites/:parkId`

Requires auth. Adds a park to favorites.

Response `201`:

```json
{
  "park": {
    "id": "ObjectId",
    "name": "Volkspark Friedrichshain"
  }
}
```

#### DELETE `/users/me/favorites/:parkId`

Requires auth. Removes a park from favorites.

Response `204`.

#### GET `/users/:id`

Returns a public user profile.

### Parks

#### Park Coordinates

This backend does not use Google Geocoding. Parks must be created with stored MongoDB GeoJSON coordinates.

```json
{
  "location": {
    "type": "Point",
    "coordinates": [16.397, 48.216]
  }
}
```

MongoDB GeoJSON uses `[longitude, latitude]`, not `[latitude, longitude]`.

#### GET `/parks`

Lists parks.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `q` | string | Text search across name, description, tags and amenities |
| `tags` | csv | Require all listed tags |
| `amenities` | csv | Require all listed amenities |
| `lat` | number | Latitude for nearby search |
| `lng` | number | Longitude for nearby search |
| `maxDistance` | number | Search radius in meters, default from `DEFAULT_NEARBY_RADIUS_METERS` or `5000` |
| `format` | string | Set to `xml` for XML response |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

Example:

```http
GET /api/parks?tags=off-leash,shady&lat=52.52&lng=13.405&maxDistance=3000
```

Response `200`:

```json
{
  "data": [
    {
      "id": "ObjectId",
      "name": "Volkspark Friedrichshain",
      "slug": "volkspark-friedrichshain"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

For geo searches, `total` and `pages` are `null` because MongoDB `$near` queries are optimized for distance ordering rather than count pagination.

#### GET `/parks/nearby`

Lists parks near a coordinate using the stored `park.location` GeoJSON point. Auth is not required. Admin is not required. Supports JSON and XML.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `lat` | number | Required latitude |
| `lng` | number | Required longitude |
| `radius` | number | Optional radius in meters, default from `DEFAULT_NEARBY_RADIUS_METERS` or `5000` |
| `format` | string | Set to `xml` for XML response |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

Example:

```http
GET /api/parks/nearby?lat=48.2082&lng=16.3738&radius=5000
```

Response `200`:

```json
{
  "data": [
    {
      "id": "ObjectId",
      "name": "Stadtpark Umgebung"
    }
  ],
  "search": {
    "latitude": 48.2082,
    "longitude": 16.3738,
    "radius": 5000
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": null,
    "pages": null
  }
}
```

Common errors:

- `400 INVALID_COORDINATES`
- `400 INVALID_RADIUS`

#### POST `/parks`

Requires auth. Creates a park.

No external geocoding API is called. `location` is required and must be a MongoDB GeoJSON `Point` with coordinates in `[longitude, latitude]` order.

Request:

```json
{
  "name": "Hundezone Prater",
  "description": "Grosse Hundezone im Prater.",
  "address": {
    "street": "Prater Hauptallee",
    "city": "Wien",
    "postalCode": "1020",
    "country": "Austria"
  },
  "location": {
    "type": "Point",
    "coordinates": [16.397, 48.216]
  },
  "tags": ["large", "green", "popular"],
  "amenities": ["fenced", "water", "benches"],
  "rules": {
    "leashRequired": false,
    "fenced": false,
    "dogWasteBags": true
  },
  "photos": ["https://example.com/park.jpg"]
}
```

Response `201`:

```json
{
  "park": {
    "id": "ObjectId",
    "name": "Volkspark Friedrichshain",
    "slug": "volkspark-friedrichshain"
  }
}
```

Common errors:

- `400 VALIDATION_ERROR`
- `400 LOCATION_REQUIRED`
- `400 INVALID_LOCATION_TYPE`
- `400 INVALID_LOCATION_COORDINATES`
- `401 AUTH_REQUIRED`

#### GET `/parks/:idOrSlug`

Returns one park by MongoDB id or slug. Supports JSON and XML.

#### GET `/parks/:id/weather`

Returns current weather for a park's stored coordinates. Auth is not required. Admin is not required. Requires `OPENWEATHER_API_KEY`.

Response `200`:

```json
{
  "park": {
    "id": "ObjectId",
    "name": "Prater Hundezone"
  },
  "weather": {
    "temperature": 21.4,
    "feelsLike": 20.9,
    "description": "clear sky",
    "icon": "01d",
    "humidity": 55,
    "windSpeed": 3.2,
    "source": "OpenWeather"
  }
}
```

Common errors:

- `400 PARK_COORDINATES_MISSING`
- `404 PARK_NOT_FOUND`
- `503 OPENWEATHER_NOT_CONFIGURED`

#### PATCH `/parks/:id`

Requires auth. Only the creator or an admin can edit.

Editable fields:

- `name`
- `slug`
- `description`
- `address`
- `location`
- `tags`
- `amenities`
- `rules`
- `photos`

#### DELETE `/parks/:id`

Requires auth. Only the creator or an admin can delete. Deletes reviews for the park as well.

Response `204`.

### Park Reviews

#### GET `/parks/:parkId/reviews`

Lists reviews for a park. `parkId` can be a park id or slug.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

#### POST `/parks/:parkId/reviews`

Requires auth. Creates the current user's review for a park. `parkId` can be a park id or slug.

Request:

```json
{
  "rating": 5,
  "title": "Great for social dogs",
  "body": "Lots of space and friendly people.",
  "visitDate": "2026-05-17",
  "tags": ["friendly", "clean"],
  "dogFriendliness": 5,
  "cleanliness": 4,
  "crowdLevel": 3
}
```

Response `201`:

```json
{
  "review": {
    "id": "ObjectId",
    "rating": 5,
    "park": "ObjectId",
    "user": {
      "id": "ObjectId",
      "username": "mika"
    }
  }
}
```

### Reviews

#### PATCH `/reviews/:id`

Requires auth. Only the review author or an admin can edit.

Editable fields:

- `rating`
- `title`
- `body`
- `visitDate`
- `tags`
- `dogFriendliness`
- `cleanliness`
- `crowdLevel`

#### DELETE `/reviews/:id`

Requires auth. Only the review author or an admin can delete.

Response `204`.

### Admin

All admin routes require a valid JWT and `role: "admin"`.

#### GET `/admin/users`

Lists users.

Query parameters: `page`, `limit`.

Response `200`:

```json
{
  "data": [
    {
      "id": "ObjectId",
      "username": "admin",
      "email": "admin@meetn-sniff.demo",
      "role": "admin"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

Common errors: `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`.

#### PATCH `/admin/users/:id/role`

Changes a user's role.

Request:

```json
{
  "role": "admin"
}
```

Allowed roles: `user`, `admin`.

Common errors: `400 INVALID_ROLE`, `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`, `404 USER_NOT_FOUND`.

#### DELETE `/admin/users/:id`

Deletes a user and that user's reviews. Affected park ratings are recalculated. Admins cannot delete their own account through this endpoint.

Response `204`.

Common errors: `400 CANNOT_DELETE_SELF`, `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`, `404 USER_NOT_FOUND`.

#### GET `/admin/reviews`

Lists reviews with populated user and park summaries.

Query parameters: `page`, `limit`.

Common errors: `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`.

#### DELETE `/admin/reviews/:id`

Deletes a review and recalculates the affected park rating.

Response `204`.

Common errors: `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`, `404 REVIEW_NOT_FOUND`.

#### GET `/admin/parks`

Lists parks.

Query parameters: `page`, `limit`.

Common errors: `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`.

#### DELETE `/admin/parks/:id`

Deletes a park, its reviews and removes it from user favorites.

Response `204`.

Common errors: `401 AUTH_REQUIRED`, `403 ADMIN_REQUIRED`, `404 PARK_NOT_FOUND`.
