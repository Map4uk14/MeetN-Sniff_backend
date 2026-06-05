const { createHttpError } = require('../middleware/errorHandler');

function parseCoordinate(value, name) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createHttpError(400, `${name} must be a valid number`, 'INVALID_COORDINATES');
  }

  return number;
}

function validateCoordinates(lat, lng) {
  const latitude = parseCoordinate(lat, 'lat');
  const longitude = parseCoordinate(lng, 'lng');

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw createHttpError(400, 'Coordinates are outside the valid range', 'INVALID_COORDINATES');
  }

  return { latitude, longitude };
}

async function getCurrentWeatherByCoordinates(lat, lng) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Keep startup independent from external weather credentials; fail only when this endpoint is used.
  if (!apiKey) {
    throw createHttpError(503, 'OpenWeather API key is not configured', 'OPENWEATHER_NOT_CONFIGURED');
  }

  const { latitude, longitude } = validateCoordinates(lat, lng);
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', latitude);
  url.searchParams.set('lon', longitude);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('appid', apiKey);

  let response;

  try {
    response = await fetch(url);
  } catch (_error) {
    throw createHttpError(502, 'OpenWeather request failed', 'OPENWEATHER_REQUEST_FAILED');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message ? `OpenWeather error: ${payload.message}` : 'OpenWeather returned an error';
    throw createHttpError(response.status, message, 'OPENWEATHER_ERROR');
  }

  return {
    temperature: payload?.main?.temp,
    feelsLike: payload?.main?.feels_like,
    description: payload?.weather?.[0]?.description,
    icon: payload?.weather?.[0]?.icon,
    humidity: payload?.main?.humidity,
    windSpeed: payload?.wind?.speed,
    source: 'OpenWeather',
  };
}

module.exports = {
  getCurrentWeatherByCoordinates,
  validateCoordinates,
};
