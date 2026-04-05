const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

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

app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined'));
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

app.use('/media', express.static(path.resolve(__dirname, '../storage')));

app.use('/', routes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use(errorHandler);

module.exports = app;


