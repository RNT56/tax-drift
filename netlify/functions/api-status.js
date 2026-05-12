const { getConfiguredProviders } = require('../lib/market-data-providers');
const { getConfiguredAiProviders } = require('../lib/ai-providers');

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
  const env = process.env || {};
  const configuredProviders = getConfiguredProviders();
  const hasLiveProvider = configuredProviders.length > 0;
  const configuredAiProviders = getConfiguredAiProviders(env);
  const hasEncryption = !!env.DATA_ENCRYPTION_KEY;
  let blobStore = 'memory-fallback';
  try {
    require('@netlify/blobs');
    blobStore = 'netlify-blobs';
  } catch {
    blobStore = 'unavailable';
  }

  return json(200, {
    hasLiveProvider,
    provider: hasLiveProvider ? 'Market data' : null,
    activeProviderCount: configuredProviders.length,
    mode: hasLiveProvider ? 'live' : 'manual',
    features: {
      symbolSearch: hasLiveProvider ? 'multi-provider' : 'fallback',
      latestPrice: hasLiveProvider ? 'available' : 'unavailable',
      latestQuoteFields: hasLiveProvider ? 'available' : 'unavailable',
      priceHistory: hasLiveProvider ? 'available' : 'unavailable',
      globalCoverage: hasLiveProvider ? 'broad' : 'limited',
      identity: 'configured-by-deployment',
      blobStore,
      encryption: hasEncryption ? 'configured' : 'missing',
      resend: env.RESEND_API_KEY ? 'configured' : 'missing',
      scheduledAlerts: 'hourly',
      aiResearch: configuredAiProviders.length ? 'configured' : 'evidence-only',
      aiProviderCount: configuredAiProviders.length
    }
  }, 300);
};
