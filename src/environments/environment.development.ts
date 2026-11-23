export const environment = {
  production: false,
  apiUrl: '',
  sqlAgent: {
    /** Same-origin via proxy.conf.js → http://127.0.0.1:8050 */
    baseUrl: 'http://127.0.0.1:8050/api/v1',
    healthPath: '/health',
    /** JWT ask — uses Kayian ERP Bearer token (auth interceptor). */
    askPath: '/chat',
    streamPath: '/chat/stream',
    preferStream: true,
    streamRequiresAuth: true,
    streamCumulative: true,
    askTimeoutMs: 180_000,
    /** Local: keep open unless you seed `aiAssistant.use` in the API. */
    requirePermission: false,
  },
};
