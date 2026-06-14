const { createHttpError } = require('../middleware/errorHandler');

const DEFAULT_API_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CACHE_TTL_MS = 300000;
const MAX_CACHE_ENTRIES = 100;
const supportedElementTypes = new Set(['node', 'way', 'relation']);
const responseCache = new Map();

function readPositiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getConfig() {
  return {
    apiUrl: process.env.OVERPASS_API_URL || DEFAULT_API_URL,
    timeoutMs: readPositiveInteger(process.env.OVERPASS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    cacheTtlMs: readPositiveInteger(process.env.OVERPASS_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
  };
}

function getCachedResponse(key) {
  const cached = responseCache.get(key);

  if (!cached || cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }

  return cached.payload;
}

function cacheResponse(key, payload, ttlMs) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    // Map keeps insertion order, so this drops the oldest cached query.
    responseCache.delete(responseCache.keys().next().value);
  }

  responseCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

async function requestOverpass(query, cacheKey) {
  const config = getConfig();
  const cached = getCachedResponse(cacheKey);

  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let response;

  try {
    response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': 'MeetN-Sniff/1.0 university project',
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError(504, 'OpenStreetMap Overpass request timed out', 'OVERPASS_TIMEOUT');
    }

    throw createHttpError(502, 'OpenStreetMap Overpass request failed', 'OVERPASS_REQUEST_FAILED');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    throw createHttpError(503, 'OpenStreetMap Overpass rate limit reached', 'OVERPASS_RATE_LIMITED');
  }

  if (!response.ok) {
    throw createHttpError(502, 'OpenStreetMap Overpass returned an error', 'OVERPASS_ERROR');
  }

  const payload = await response.json().catch(() => null);

  if (!payload || !Array.isArray(payload.elements)) {
    throw createHttpError(502, 'OpenStreetMap Overpass returned invalid data', 'OVERPASS_INVALID_RESPONSE');
  }

  cacheResponse(cacheKey, payload, config.cacheTtlMs);
  return payload;
}

function getElementCoordinates(element) {
  // Nodes expose coordinates directly; ways and relations use the center requested in Overpass QL.
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function joinStreet(tags) {
  return [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || undefined;
}

function limitString(value, maximumLength) {
  return value ? String(value).trim().slice(0, maximumLength) || undefined : undefined;
}

function isYes(value) {
  return ['yes', 'true', '1'].includes(String(value || '').toLowerCase());
}

function calculateDistanceMeters(origin, coordinates) {
  if (!origin) {
    return undefined;
  }

  // Haversine distance is accurate enough for sorting nearby discovery results.
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(coordinates.latitude - origin.latitude);
  const longitudeDelta = toRadians(coordinates.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const targetLatitude = toRadians(coordinates.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeDogParkElement(element, origin) {
  const coordinates = getElementCoordinates(element);

  if (!coordinates || !supportedElementTypes.has(element.type)) {
    return null;
  }

  const tags = element.tags || {};
  const amenities = [];

  if (isYes(tags.bench)) amenities.push('benches');
  if (isYes(tags.drinking_water)) amenities.push('water');
  if (isYes(tags.waste_basket) || isYes(tags.dog_waste_basket)) amenities.push('waste-bags');
  if (isYes(tags.lit)) amenities.push('lighting');

  const parkTags = ['dog-park', 'openstreetmap'];
  if (tags.surface) parkTags.push(`surface-${tags.surface}`);
  if (tags.access) parkTags.push(`access-${tags.access}`);

  return {
    source: {
      provider: 'openstreetmap',
      elementType: element.type,
      elementId: String(element.id),
      url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      attribution: '© OpenStreetMap contributors',
      licenseUrl: 'https://www.openstreetmap.org/copyright',
    },
    name: limitString(tags.name || tags['name:de'], 120) || `OpenStreetMap dog park ${element.id}`,
    description: limitString(tags.description || tags.note, 1000),
    address: {
      street: limitString(joinStreet(tags), 160),
      city: limitString(tags['addr:city'] || tags['addr:place'] || tags['addr:suburb'], 100),
      postalCode: limitString(tags['addr:postcode'], 20),
      country: limitString(tags['addr:country'], 80),
    },
    location: {
      type: 'Point',
      coordinates: [coordinates.longitude, coordinates.latitude],
    },
    tags: parkTags,
    amenities,
    rules: {
      leashRequired: tags.dog === 'leashed' || isYes(tags.leash),
      fenced: tags.barrier === 'fence' || isYes(tags.fenced),
      dogWasteBags: isYes(tags.dog_waste_basket),
    },
    distanceMeters: calculateDistanceMeters(origin, coordinates),
  };
}

function validateElementReference(elementType, elementId) {
  if (!supportedElementTypes.has(elementType) || !/^[1-9]\d*$/.test(String(elementId))) {
    throw createHttpError(400, 'Invalid OpenStreetMap element reference', 'INVALID_OSM_REFERENCE');
  }
}

async function discoverDogParks(latitude, longitude, radius, limit) {
  const timeoutSeconds = Math.max(1, Math.floor(getConfig().timeoutMs / 1000));
  // nwr searches nodes, ways and relations in one query; "out center" adds coordinates for areas.
  const query = [
    `[out:json][timeout:${timeoutSeconds}];`,
    '(',
    `nwr["leisure"="dog_park"](around:${radius},${latitude},${longitude});`,
    ');',
    'out center tags;',
  ].join('');
  const cacheKey = `discover:${latitude}:${longitude}:${radius}`;
  const payload = await requestOverpass(query, cacheKey);
  const origin = { latitude, longitude };

  return payload.elements
    .map((element) => normalizeDogParkElement(element, origin))
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
}

async function getDogParkByReference(elementType, elementId) {
  validateElementReference(elementType, elementId);

  const timeoutSeconds = Math.max(1, Math.floor(getConfig().timeoutMs / 1000));
  const query = [
    `[out:json][timeout:${timeoutSeconds}];`,
    `${elementType}(${elementId})["leisure"="dog_park"];`,
    'out center tags;',
  ].join('');
  const payload = await requestOverpass(query, `element:${elementType}:${elementId}`);
  const park = payload.elements.map((element) => normalizeDogParkElement(element)).find(Boolean);

  if (!park) {
    throw createHttpError(404, 'OpenStreetMap dog park not found', 'OSM_PARK_NOT_FOUND');
  }

  return park;
}

module.exports = {
  discoverDogParks,
  getDogParkByReference,
};
