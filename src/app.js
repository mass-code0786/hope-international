const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const errorHandler = require('./middleware/errorHandler');
const { nowMs } = require('./utils/perf');
const landingMediaStorageService = require('./services/landingMediaStorageService');

const app = express();

landingMediaStorageService.assertPersistentStorageConfiguration();

app.use(helmet());
app.use(cors({
  origin: [
    'https://hope-international.vercel.app',
    'https://hopeinternational.uk',
    'https://www.hopeinternational.uk'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use('/api/payments', paymentsRoutes);
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined'));
app.use((req, res, next) => {
  const startedAt = nowMs();
  res.on('finish', () => {
    const durationMs = Number((nowMs() - startedAt).toFixed(1));
    const thresholdMs = 250;
    if (durationMs >= thresholdMs) {
      console.warn('[perf.request]', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      });
    }
  });
  next();
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hope International backend is running',
    service: 'hope-international-backend'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(
  landingMediaStorageService.getPublicPrefix(),
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  ...landingMediaStorageService.getStaticRoots().map((root) => express.static(root))
);

app.use('/', routes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use(errorHandler);

module.exports = app;


