const { parseOrigins } = require('./cors');

const JWT_ALGORITHM = 'HS256';
const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_JWT_EXPIRES_IN = '1h';
const DEFAULT_JWT_ISSUER = 'meetn-sniff-api';
const DEFAULT_JWT_AUDIENCE = 'meetn-sniff-client';

function getJwtConfig(env = process.env) {
  const secret = env.JWT_SECRET;

  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
  }

  return {
    secret,
    expiresIn: env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
    issuer: env.JWT_ISSUER || DEFAULT_JWT_ISSUER,
    audience: env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE,
  };
}

function validateProductionCors(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const origins = parseOrigins(env.CORS_ORIGINS || env.CLIENT_ORIGIN || env.FRONTEND_ORIGIN);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  const localOrigin = origins.find((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch (_error) {
      return true;
    }
  });

  if (localOrigin) {
    throw new Error(`Production CORS origin is not allowed: ${localOrigin}`);
  }
}

function validateSecurityConfig(env = process.env) {
  getJwtConfig(env);
  validateProductionCors(env);
}

module.exports = {
  DEFAULT_JWT_AUDIENCE,
  DEFAULT_JWT_EXPIRES_IN,
  DEFAULT_JWT_ISSUER,
  JWT_ALGORITHM,
  MIN_JWT_SECRET_LENGTH,
  getJwtConfig,
  validateSecurityConfig,
};
