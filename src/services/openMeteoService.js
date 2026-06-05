const { createHttpError } = require('../middleware/errorHandler');
const { validateCoordinates } = require('./weatherService');

async function getForecastByCoordinates(lat, lng) {
  const { latitude, longitude } = validateCoordinates(lat, lng);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current', 'temperature_2m,precipitation,wind_speed_10m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '3');

  let response;

  try {
    response = await fetch(url);
  } catch (_error) {
    throw createHttpError(502, 'Open-Meteo request failed', 'OPEN_METEO_REQUEST_FAILED');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw createHttpError(response.status, 'Open-Meteo returned an error', 'OPEN_METEO_ERROR');
  }

  return {
    current: {
      temperature: payload?.current?.temperature_2m,
      precipitation: payload?.current?.precipitation,
      windSpeed: payload?.current?.wind_speed_10m,
      time: payload?.current?.time,
    },
    daily: (payload?.daily?.time || []).map((date, index) => ({
      date,
      weatherCode: payload.daily.weather_code?.[index],
      temperatureMax: payload.daily.temperature_2m_max?.[index],
      temperatureMin: payload.daily.temperature_2m_min?.[index],
      precipitationSum: payload.daily.precipitation_sum?.[index],
    })),
    source: 'Open-Meteo',
  };
}

module.exports = {
  getForecastByCoordinates,
};
