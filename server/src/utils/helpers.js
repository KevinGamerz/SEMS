import prisma from '../db.js';

export async function auditLog(userId, action, entityType, entityId, metadata, ipAddress) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress
      }
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}
