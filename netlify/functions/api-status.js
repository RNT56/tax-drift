const json = (statusCode, payload, cacheSeconds = 0) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheSeconds > 0
      ? `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`
      : 'no-store'
  },
  body: JSON.stringify(payload)
});

exports.handler = async () => {
  const hasKey = Boolean(process.env.TWELVE_DATA_API_KEY);

  return json(200, {
    hasLiveProvider: hasKey,
    provider: hasKey ? 'Twelve Data' : null,
    mode: hasKey ? 'live' : 'manual',
    features: {
      symbolSearch: hasKey ? 'live' : 'fallback',
      latestPrice: hasKey ? 'available' : 'unavailable',
      globalCoverage: hasKey ? 'broad' : 'limited'
    }
  }, 300);
};
