# MeetN-Sniff API

Pinned source of truth for the backend API.

## Base URL

Development default:

```text
http://localhost:3000/api
```

All backend routes are mounted below `/api`, for example:

```text
https://meetn-sniff.example.com/api/parks
```

During local development, browser origins are controlled with `CORS_ORIGINS`. Requests without an `Origin` header, such as cURL or server-to-server calls, are allowed.

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
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OVERPASS_TIMEOUT_MS=15000
OVERPASS_CACHE_TTL_MS=300000
OVERPASS_DEFAULT_RADIUS_METERS=3000
OVERPASS_MAX_RADIUS_METERS=10000
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
- Open-Meteo Forecast is used as a second external REST API and does not require an API key.
- OpenStreetMap Overpass is used for dog park discovery and does not require an API key.
- Overpass searches default to `3000` meters, are limited to `10000` meters and are cached for `5` minutes by default.

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
  "username": "marlon",
  "email": "marlon@example.com",
  "displayName": "Marlon",
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
  "externalSource": {
    "provider": "openstreetmap",
    "elementType": "way",
    "elementId": "442138180",
    "url": "https://www.openstreetmap.org/way/442138180",
    "attribution": "© OpenStreetMap contributors",
    "licenseUrl": "https://www.openstreetmap.org/copyright"
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
- `externalSource` is only present when a park was imported from an external service.

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
  "username": "marlon",
  "email": "marlon@example.com",
  "password": "supersecret",
  "displayName": "Marlon",
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
    "username": "marlon",
    "email": "marlon@example.com"
  }
}
```

#### POST `/auth/login`

Request:

```json
{
  "email": "marlon@example.com",
  "password": "supersecret"
}
```

Response `200`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "ObjectId",
    "username": "marlon",
    "email": "marlon@example.com"
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
  "displayName": "Marlon and Nala",
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

#### DELETE `/users/me`

Requires auth. Permanently deletes the current account.

The deletion also:

- deletes parks created by the user,
- deletes reviews written by the user,
- deletes reviews belonging to the user's parks,
- removes deleted parks from all user favorites,
- recalculates ratings for surviving parks affected by deleted reviews.

Response `204`.

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

Parks must be created with stored MongoDB GeoJSON coordinates.

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

#### GET `/parks/discover`

Searches OpenStreetMap Overpass for dog parks near a coordinate. Auth is not required. Results are not stored automatically.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `lat` | number | Required latitude |
| `lng` | number | Required longitude |
| `radius` | number | Optional radius in meters, default `3000`, maximum `10000` |
| `limit` | number | Optional result limit, default `30`, maximum `100` |

Example:

```http
GET /api/parks/discover?lat=48.2082&lng=16.3738&radius=5000&limit=20
```

Response `200`:

```json
{
  "data": [
    {
      "source": {
        "provider": "openstreetmap",
        "elementType": "way",
        "elementId": "442138180",
        "url": "https://www.openstreetmap.org/way/442138180",
        "attribution": "© OpenStreetMap contributors",
        "licenseUrl": "https://www.openstreetmap.org/copyright"
      },
      "name": "OpenStreetMap dog park 442138180",
      "address": {},
      "location": {
        "type": "Point",
        "coordinates": [16.38, 48.21]
      },
      "tags": ["dog-park", "openstreetmap"],
      "amenities": [],
      "rules": {
        "leashRequired": false,
        "fenced": true,
        "dogWasteBags": false
      },
      "distanceMeters": 687
    }
  ],
  "search": {
    "latitude": 48.2082,
    "longitude": 16.3738,
    "radius": 5000,
    "limit": 20
  },
  "source": "OpenStreetMap Overpass API",
  "attribution": "© OpenStreetMap contributors",
  "licenseUrl": "https://www.openstreetmap.org/copyright"
}
```

Clients displaying discovered or imported OpenStreetMap data must keep the OpenStreetMap attribution visible.

Common errors:

- `400 INVALID_COORDINATES`
- `400 INVALID_DISCOVERY_RADIUS`
- `400 INVALID_DISCOVERY_LIMIT`
- `502 OVERPASS_REQUEST_FAILED`
- `502 OVERPASS_ERROR`
- `502 OVERPASS_INVALID_RESPONSE`
- `503 OVERPASS_RATE_LIMITED`
- `504 OVERPASS_TIMEOUT`

#### POST `/parks/discover/:elementType/:elementId/import`

Requires auth. Imports a selected discovery result into MongoDB. The backend fetches the OpenStreetMap element again instead of trusting coordinates sent by the client.

Supported element types: `node`, `way`, `relation`.

Optional request fields can complete or override the imported data:

```json
{
  "name": "Hundezone Innenstadt",
  "description": "Imported from OpenStreetMap and checked by the user.",
  "address": {
    "city": "Wien",
    "country": "Austria"
  },
  "tags": ["central"],
  "amenities": ["benches"],
  "rules": {
    "fenced": true
  },
  "photos": []
}
```

`address.city` and `address.country` are required when the OpenStreetMap element does not provide them.

Example:

```http
POST /api/parks/discover/way/442138180/import
Authorization: Bearer <token>
Content-Type: application/json
```

Response `201`:

```json
{
  "park": {
    "id": "ObjectId",
    "name": "Hundezone Innenstadt",
    "slug": "hundezone-innenstadt-osm-way-442138180"
  }
}
```

The stored park includes an `externalSource` reference. A unique MongoDB index prevents importing the same OpenStreetMap element more than once.

Common errors:

- `400 INVALID_OSM_REFERENCE`
- `400 IMPORT_ADDRESS_REQUIRED`
- `401 AUTH_REQUIRED`
- `404 OSM_PARK_NOT_FOUND`
- `409 OSM_PARK_ALREADY_IMPORTED`
- Overpass errors listed for the discovery endpoint

#### POST `/parks`

Requires auth. Creates a park.

`location` is required and must be a MongoDB GeoJSON `Point` with coordinates in `[longitude, latitude]` order.

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

#### GET `/parks/:id/forecast`

Returns a short forecast for a park's stored coordinates via Open-Meteo. Auth is not required. Admin is not required. No API key is required.

Response `200`:

```json
{
  "park": {
    "id": "ObjectId",
    "name": "Hundezone Prater"
  },
  "forecast": {
    "current": {
      "temperature": 23.1,
      "precipitation": 0,
      "windSpeed": 7.2,
      "time": "2026-06-06T12:00"
    },
    "daily": [
      {
        "date": "2026-06-06",
        "weatherCode": 3,
        "temperatureMax": 25.4,
        "temperatureMin": 16.8,
        "precipitationSum": 0.2
      }
    ],
    "source": "Open-Meteo"
  }
}
```

Common errors:

- `400 PARK_COORDINATES_MISSING`
- `404 PARK_NOT_FOUND`
- `502 OPEN_METEO_REQUEST_FAILED`

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

#### PUT `/parks/:id`

Requires auth. Only the creator or an admin can edit. Covers the PUT requirement by updating park resource fields with the same writable fields as `PATCH /parks/:id`.

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
      "username": "marlon"
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

Deletes a user with the same dependent-data cleanup as `DELETE /users/me`. Affected ratings are recalculated. Admins cannot delete their own account through this endpoint.

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
