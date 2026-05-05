import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { authenticateJWT, requireRole, validate } from '../middleware/auth.js';
import { createUserSchema, updateUserSchema } from '../utils/schemas.js';
import { sanitizeUser, auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// GET /api/users
router.get('/', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { zoneAssignments: { include: { zone: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users: users.map(u => sanitizeUser(u)) });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/users
router.post('/', authenticateJWT, requireRole(['super_admin']), validate(createUserSchema), async (req, res) => {
  try {
    const { email, name, password, role, zoneIds } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email, name, role,
        password: hashedPassword,
        zoneAssignments: zoneIds?.length ? {
          create: zoneIds.map(zoneId => ({ zoneId }))
        } : undefined
      },
      include: { zoneAssignments: { include: { zone: { select: { id: true, name: true } } } } }
    });

    await auditLog(req.user.userId, 'CREATE_USER', 'user', user.id, { role }, getClientIp(req));
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/users/:id
router.patch('/:id', authenticateJWT, requireRole(['super_admin']), validate(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status, zoneIds } = req.body;

    // Cannot demote self
    if (id === req.user.userId && role && role !== 'super_admin') {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (status) {
      updateData.status = status;
      // If disabling, invalidate all refresh tokens
      if (status === 'disabled') {
        await prisma.refreshToken.deleteMany({ where: { userId: id } });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { zoneAssignments: { include: { zone: { select: { id: true, name: true } } } } }
    });

    // Update zone assignments if provided
    if (zoneIds !== undefined) {
      await prisma.zoneAssignment.deleteMany({ where: { userId: id } });
      if (zoneIds.length > 0) {
        await prisma.zoneAssignment.createMany({
          data: zoneIds.map(zoneId => ({ userId: id, zoneId }))
        });
      }
      // Refetch with updated assignments
      const refreshed = await prisma.user.findUnique({
        where: { id },
        include: { zoneAssignments: { include: { zone: { select: { id: true, name: true } } } } }
      });
      await auditLog(req.user.userId, 'UPDATE_USER', 'user', id, req.body, getClientIp(req));
      return res.json({ user: sanitizeUser(refreshed) });
    }

    await auditLog(req.user.userId, 'UPDATE_USER', 'user', id, req.body, getClientIp(req));
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// DELETE /api/users/:id (soft delete — set status to disabled)
router.delete('/:id', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot disable your own account.' });
    }

    await prisma.user.update({ where: { id }, data: { status: 'disabled' } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    await auditLog(req.user.userId, 'DISABLE_USER', 'user', id, null, getClientIp(req));
    res.json({ message: 'User disabled' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
