const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const DEFAULT_INSECURE_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Resolves JWT secret with strict fail-closed enforcement in production (NIST SP 800-207).
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret || secret === DEFAULT_INSECURE_SECRET) {
      throw new Error('FATAL: JWT_SECRET must be configured with a secure key in production');
    }
  }

  return secret || DEFAULT_INSECURE_SECRET;
}

/**
 * Authentication middleware: verifies Bearer JWT token with pinned HS256 algorithm.
 */
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token signature or payload.', 401));
  }
};

/**
 * Authorization guard: ensures caller owns the target userId or possesses admin privileges.
 */
const authorizeSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  const targetUserId = req.params.userId || req.body.userId;
  const currentUserId = req.user.userId || req.user.id || req.user.sub;

  if (req.user.role === 'admin' || currentUserId === targetUserId) {
    return next();
  }

  return next(new AppError('Access denied: You are not authorized to access or modify this resource.', 403));
};

module.exports = {
  authenticateUser,
  authorizeSelfOrAdmin,
  getJwtSecret,
};
