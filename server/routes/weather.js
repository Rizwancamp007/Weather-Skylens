const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const SearchHistory = require('../models/SearchHistory');

const router = express.Router();

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

// Helper: proxy fetch to OpenWeatherMap
async function proxyFetch(endpoint, params) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('API_KEY_MISSING');
  }

  const url = new URL(`${OPENWEATHER_BASE}/${endpoint}`);
  url.searchParams.set('appid', apiKey);

  // Add all passed params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// GET /api/weather/current?city=Lahore  OR  ?lat=51.5&lon=-0.12
router.get('/current', optionalAuth, async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    const params = { units };

    if (city) {
      params.q = city;
    } else if (lat && lon) {
      params.lat = lat;
      params.lon = lon;
    } else {
      return res.status(400).json({ error: 'Provide city name or lat/lon coordinates' });
    }

    const data = await proxyFetch('weather', params);

    // Save to search history if user is logged in
    if (req.user) {
      try {
        await SearchHistory.create({
          userId: req.user._id,
          city: data.name,
          country: data.sys?.country,
          temperature: data.main?.temp,
          condition: data.weather?.[0]?.description,
          icon: data.weather?.[0]?.icon,
        });
      } catch (histErr) {
        // Don't fail the request if history save fails
        console.error('History save error:', histErr.message);
      }
    }

    res.json(data);
  } catch (error) {
    if (error.message === 'API_KEY_MISSING') {
      return res.status(503).json({
        error: 'Weather API key not configured. Please add your OpenWeatherMap API key to server/.env',
      });
    }
    res.status(error.status || 500).json({
      error: error.data?.message || error.message || 'Failed to fetch weather data',
    });
  }
});

// GET /api/weather/forecast?city=Lahore  OR  ?lat=51.5&lon=-0.12
router.get('/forecast', async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    const params = { units };

    if (city) {
      params.q = city;
    } else if (lat && lon) {
      params.lat = lat;
      params.lon = lon;
    } else {
      return res.status(400).json({ error: 'Provide city name or lat/lon coordinates' });
    }

    const data = await proxyFetch('forecast', params);
    res.json(data);
  } catch (error) {
    if (error.message === 'API_KEY_MISSING') {
      return res.status(503).json({
        error: 'Weather API key not configured',
      });
    }
    res.status(error.status || 500).json({
      error: error.data?.message || 'Failed to fetch forecast data',
    });
  }
});

// GET /api/weather/aqi?lat=51.5&lon=-0.12
router.get('/aqi', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Provide lat and lon coordinates' });
    }

    const data = await proxyFetch('air_pollution', { lat, lon });
    res.json(data);
  } catch (error) {
    if (error.message === 'API_KEY_MISSING') {
      return res.status(503).json({
        error: 'Weather API key not configured',
      });
    }
    res.status(error.status || 500).json({
      error: error.data?.message || 'Failed to fetch air quality data',
    });
  }
});

module.exports = router;
