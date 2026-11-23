/**
 * Dev proxy for Angular (@angular/build:dev-server).
 * /api        → Kayian ERP backend :5000
 * /sql-agent/* → SQL Agent localhost:8050/api/v1/*
 * /sql-agent/health → SQL Agent localhost:8050/health
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
    pathRewrite: { '^/api/v1': '' },
    logLevel: 'debug',
  },
];
