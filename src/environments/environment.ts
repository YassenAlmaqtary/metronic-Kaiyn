export const environment = {
  production: true,
  apiUrl: 'http://localhost:5000',
  sqlAgent: {
    baseUrl: 'http://127.0.0.1:8050',
    healthPath: '/health',
    askPath: '/ask',
    streamPath: '',
    preferStream: false,
    streamRequiresAuth: true,
    streamCumulative: true,
    askTimeoutMs: 180_000,
  },
};
