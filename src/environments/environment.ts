export const environment = {
  production: true,
  apiUrl: 'http://localhost:5000',
  sqlAgent: {
    baseUrl: 'http://127.0.0.1:8050',
    /** Published SQL Agent (JWT /ask — same Kayian token). */
    // baseUrl: 'https://kayianagent.deliciousdemo.site',
    healthPath: '/health',
    askPath: '/ask',
    streamPath: '',
    preferStream: false,
    streamRequiresAuth: true,
    streamCumulative: true,
    askTimeoutMs: 180_000,
    /** Gate assistant UI by `aiAssistant.use` (super users always allowed). */
    requirePermission: true,
  },
};
