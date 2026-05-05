import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to access this resource." });
    }
    next();
  };
}

export async function requireZoneAccess(req, res, next) {
  const { role, userId, zoneIds } = req.user;

  // Super Admin and Auditor bypass zone restriction
  if (role === 'super_admin' || role === 'auditor') return next();

  // Resolve target zone from request
  const targetZoneId = req.params.zoneId || req.params.id || req.body?.zoneId || req.query?.zoneId;

  if (!targetZoneId) return next(); // No zone to check

  if (!zoneIds || !zoneIds.includes(targetZoneId)) {
    return res.status(403).json({ error: 'You do not have access to this zone.' });
  }
  next();
}

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }
    req.query = result.data;
    next();
  };
}

export function requireIoTApiKey(req, res, next) {
  const key = req.headers['x-iot-api-key'];
  if (!key || key !== process.env.IOT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
