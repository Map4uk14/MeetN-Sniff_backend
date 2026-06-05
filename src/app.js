const cors = require('cors');
const express = require('express');
const helmet = require('helmet');

const { buildCorsOptions } = require('./config/cors');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const parkRoutes = require('./routes/parks');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');

const app = express();

app.set('trust proxy', Number.parseInt(process.env.TRUST_PROXY, 10) || 0);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use('/api', apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'meetn-sniff-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/parks', parkRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
