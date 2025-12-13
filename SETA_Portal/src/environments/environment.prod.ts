export const environment = {
  production: true,
  apiUrl: 'https://api.seta-portal.gov.za/api',
  dhaApiUrl: 'https://api.dha.gov.za/api',
  dhaApiKey: 'dha-api-key-2025', // Should be configured via environment variables in production
  tokenRefreshMinutes: 5,
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'af', 'zu', 'xh', 'st', 'tn', 'ts', 'ss', 've', 'nr', 'nso']
};
