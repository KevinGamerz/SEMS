import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, validate, validateQuery } from '../middleware/auth.js';
import { thresholdSchema, alertQuerySchema } from '../utils/schemas.js';
import { auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// GET /api/alerts
router.get('/', authenticateJWT, validateQuery(alertQuerySchema), async (req, res) => {
  try {
    const { zoneId, severity, status, dateFrom, dateTo, page, limit } = req.query;
    const { role, zoneIds } = req.user;

    const where = {};
    if (zoneId) where.zoneId = zoneId;
    else if (role === 'zone_manager' || role === 'field_operator') {
      where.zoneId = { in: zoneIds };
    }
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          zone: { select: { name: true } },
          building: { select: { name: true } },
          device: { select: { name: true, type: true } },
          acknowledger: { select: { name: true } },
          resolver: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.alert.count({ where })
    ]);

    res.json({ alerts, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/alerts/count
router.get('/count', authenticateJWT, async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    const where = { status: { in: ['new', 'acknowledged'] } };
    if (role === 'zone_manager' || role === 'field_operator') {
      where.zoneId = { in: zoneIds };
    }
    const count = await prisma.alert.count({ where });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/alerts/:id
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        zone: { select: { name: true } },
        building: { select: { name: true } },
        device: { select: { name: true, type: true } },
        acknowledger: { select: { name: true } },
        resolver: { select: { name: true } },
        threshold: true
      }
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', authenticateJWT, requireRole(['super_admin', 'zone_manager']), async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (alert.status !== 'new') return res.status(400).json({ error: 'Alert is not in NEW status' });

    const { role, zoneIds } = req.user;
    if (role === 'zone_manager' && !zoneIds.includes(alert.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        status: 'acknowledged',
        acknowledgedBy: req.user.userId,
        acknowledgedAt: new Date()
      }
    });

    await auditLog(req.user.userId, 'ALERT_ACKNOWLEDGE', 'alert', alert.id, null, getClientIp(req));
    res.json({ alert: updated });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', authenticateJWT, requireRole(['super_admin', 'zone_manager']), async (req, res) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (alert.status === 'resolved') return res.status(400).json({ error: 'Alert already resolved' });

    const { role, zoneIds } = req.user;
    if (role === 'zone_manager' && !zoneIds.includes(alert.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        status: 'resolved',
        resolvedBy: req.user.userId,
        resolvedAt: new Date()
      }
    });

    await auditLog(req.user.userId, 'ALERT_RESOLVE', 'alert', alert.id, null, getClientIp(req));
    res.json({ alert: updated });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/alert-thresholds
router.get('/thresholds/list', authenticateJWT, async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    const where = {};
    if (role === 'zone_manager') where.zoneId = { in: zoneIds };

    const thresholds = await prisma.alertThreshold.findMany({
      where,
      include: {
        zone: { select: { name: true } },
        building: { select: { name: true } },
        device: { select: { name: true } },
        creator: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ thresholds });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/alert-thresholds
router.post('/thresholds', authenticateJWT, requireRole(['super_admin', 'zone_manager']),
  validate(thresholdSchema), async (req, res) => {
  try {
    const { zoneId, buildingId, deviceId, thresholdKwh } = req.body;

    const { role, zoneIds } = req.user;
    if (role === 'zone_manager' && zoneId && !zoneIds.includes(zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const threshold = await prisma.alertThreshold.create({
      data: { zoneId, buildingId, deviceId, thresholdKwh, createdBy: req.user.userId }
    });

    await auditLog(req.user.userId, 'CREATE_THRESHOLD', 'threshold', threshold.id,
      { thresholdKwh }, getClientIp(req));
    res.status(201).json({ threshold });
  } catch (err) {
    console.error('Create threshold error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/alert-thresholds/:id
router.patch('/thresholds/:id', authenticateJWT, requireRole(['super_admin', 'zone_manager']), async (req, res) => {
  try {
    const { thresholdKwh } = req.body;
    if (!thresholdKwh || thresholdKwh <= 0) {
      return res.status(422).json({ error: 'Threshold must be greater than 0' });
    }

    // Zone ownership check — zone managers may only edit thresholds in their zones
    const { role, zoneIds } = req.user;
    if (role === 'zone_manager') {
      const threshold = await prisma.alertThreshold.findUnique({ where: { id: req.params.id } });
      if (!threshold) return res.status(404).json({ error: 'Threshold not found' });
      if (threshold.zoneId && !zoneIds.includes(threshold.zoneId)) {
        return res.status(403).json({ error: 'You do not have access to this threshold.' });
      }
    }

    const updated = await prisma.alertThreshold.update({
      where: { id: req.params.id },
      data: { thresholdKwh }
    });

    await auditLog(req.user.userId, 'UPDATE_THRESHOLD', 'threshold', updated.id,
      { thresholdKwh }, getClientIp(req));
    res.json({ threshold: updated });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// DELETE /api/alert-thresholds/:id
router.delete('/thresholds/:id', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
  try {
    // zone_manager is excluded from this route by requireRole above (super_admin only)
    // If you wish to allow zone managers to delete their own thresholds, add the check here.
    await prisma.alertThreshold.delete({ where: { id: req.params.id } });
    await auditLog(req.user.userId, 'DELETE_THRESHOLD', 'threshold', req.params.id, null, getClientIp(req));
    res.json({ message: 'Threshold deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
