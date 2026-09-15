/**
 * Dev proxy for Angular (@angular/build:dev-server).
 * /api        → Kayian ERP backend :5000
 * /sql-agent  → SQL Agent FastAPI   :8050  (avoids browser CORS)
 */
module.exports = [
  {
    context: ['/api'],
    target: 'http://localhost:5000',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  {
    context: ['/sql-agent'],
    target: 'http://127.0.0.1:8050',
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/sql-agent': '' },
    logLevel: 'debug',
  },
];
