import { NextResponse } from 'next/server';

const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo_key';
const BASE_URL = 'https://api.weatherapi.com/v1';
const CACHE_DURATION = 1800000; // 30 minutes

const weatherCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

// Cleanup function to remove expired cache entries
function cleanupCache() {
  const now = Date.now();
  Array.from(weatherCache.entries()).forEach(([key, value]) => {
    if (now - value.timestamp >= CACHE_DURATION) {
      weatherCache.delete(key);
    }
  });
}

// Run cleanup every CACHE_DURATION
setInterval(cleanupCache, CACHE_DURATION);

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const cacheKey = `${latitude},${longitude}`;
    const cachedData = weatherCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data);
    }

    const apiUrl = new URL(`${BASE_URL}/forecast.json`);
    apiUrl.searchParams.append('q', `${latitude},${longitude}`);
    apiUrl.searchParams.append('days', '7');
    apiUrl.searchParams.append('aqi', 'no');

    const response = await fetch(apiUrl, {
      headers: new Headers({
        key: WEATHER_API_KEY,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    weatherCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
