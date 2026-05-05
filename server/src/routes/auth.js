import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db.js';
import { authenticateJWT, validate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/schemas.js';
import { sanitizeUser, auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { zoneAssignments: { select: { zoneId: true } } }
    });

    if (!user || user.status === 'disabled') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const zoneIds = user.zoneAssignments.map(za => za.zoneId);
    const payload = { userId: user.id, role: user.role, zoneIds };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    await auditLog(user.id, 'LOGIN', 'user', user.id, null, getClientIp(req));

    res.json({
      accessToken,
      refreshToken,
      user: sanitizeUser({ ...user, zoneIds })
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Check user is still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { zoneAssignments: { select: { zoneId: true } } }
    });
    if (!user || user.status === 'disabled') {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      return res.status(401).json({ error: 'Account disabled' });
    }

    const zoneIds = user.zoneAssignments.map(za => za.zoneId);
    const payload = { userId: user.id, role: user.role, zoneIds };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    await auditLog(req.user.userId, 'LOGOUT', 'user', req.user.userId, null, getClientIp(req));
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { zoneAssignments: { select: { zoneId: true, zone: { select: { id: true, name: true } } } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const zoneIds = user.zoneAssignments.map(za => za.zoneId);
    const zones = user.zoneAssignments.map(za => za.zone);
    res.json({ user: { ...sanitizeUser(user), zoneIds, zones } });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/auth/forgot-password  
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  // Always return same response (prevent enumeration)
  res.json({ message: "If this email exists, a reset link has been sent." });
  // In background, if user exists, create reset token
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hashedToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });
      console.log(`[DEV] Password reset token for ${user.email}: ${resetToken}`);
    }
  } catch (err) {
    console.error('Forgot password error:', err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        tokenHash: hashedToken,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Link expired or invalid. Request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword }
    });

    // Invalidate token and all refresh tokens
    await prisma.passwordReset.update({ where: { id: resetRecord.id }, data: { used: true } });
    await prisma.refreshToken.deleteMany({ where: { userId: resetRecord.userId } });

    await auditLog(resetRecord.userId, 'PASSWORD_RESET', 'user', resetRecord.userId);
    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
