export const environment = {
  production: false,
  apiUrl: '',
  sqlAgent: {
    /** Same-origin via proxy.conf.js → http://127.0.0.1:8050 */
    baseUrl: '/sql-agent',
    healthPath: '/health',
    /** JWT ask — uses Kayian ERP Bearer token (auth interceptor). */
    askPath: '/ask',
    streamPath: '',
    preferStream: false,
    streamRequiresAuth: true,
    streamCumulative: true,
    askTimeoutMs: 180_000,
    /** Local: keep open unless you seed `aiAssistant.use` in the API. */
    requirePermission: false,
  },
};
