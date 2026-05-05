import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, requireZoneAccess, validate } from '../middleware/auth.js';
import { controlRequestReviewSchema, createDeviceSchema } from '../utils/schemas.js';
import { auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// GET /api/devices
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    const { zoneId, buildingId, status, type } = req.query;

    const where = {};
    if (buildingId) where.buildingId = buildingId;
    if (status) where.status = status;
    if (type) where.type = type;

    // Zone scoping
    if (zoneId) {
      const buildings = await prisma.building.findMany({ where: { zoneId }, select: { id: true } });
      where.buildingId = { in: buildings.map(b => b.id) };
    } else if (role === 'zone_manager' || role === 'field_operator') {
      const buildings = await prisma.building.findMany({
        where: { zoneId: { in: zoneIds } },
        select: { id: true }
      });
      where.buildingId = { in: buildings.map(b => b.id) };
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        building: { include: { zone: { select: { id: true, name: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ devices });
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/devices
router.post('/', authenticateJWT, requireRole(['super_admin', 'zone_manager']), validate(createDeviceSchema), async (req, res) => {
  try {
    const { name, type, impactLevel, buildingId } = req.body;
    const { role, zoneIds } = req.user;

    // Verify building exists and zone access if not super_admin
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found.' });
    }

    if (role === 'zone_manager' && !zoneIds.includes(building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to add devices in this zone.' });
    }

    const newDevice = await prisma.device.create({
      data: {
        name,
        type,
        impactLevel,
        buildingId,
        status: 'online'
      },
      include: {
        building: { include: { zone: { select: { id: true, name: true } } } }
      }
    });

    await auditLog(req.user.userId, 'DEVICE_CREATE', 'device', newDevice.id,
      { name, type, buildingId }, getClientIp(req));

    res.status(201).json({ device: newDevice, message: 'Device added successfully.' });
  } catch (err) {
    console.error('Create device error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/control-requests/pending — must be registered BEFORE /:id to avoid Express matching 'control-requests' as the id
router.get('/control-requests/pending', authenticateJWT, requireRole(['super_admin', 'zone_manager']), async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    let where = { status: 'pending' };

    if (role === 'zone_manager') {
      const buildings = await prisma.building.findMany({
        where: { zoneId: { in: zoneIds } }, select: { id: true }
      });
      const devices = await prisma.device.findMany({
        where: { buildingId: { in: buildings.map(b => b.id) } }, select: { id: true }
      });
      where.deviceId = { in: devices.map(d => d.id) };
    }

    const requests = await prisma.deviceControlRequest.findMany({
      where,
      include: {
        device: { include: { building: { include: { zone: { select: { name: true } } } } } },
        requester: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/control-requests/:id/review — also before /:id
router.patch('/control-requests/:id/review', authenticateJWT, requireRole(['super_admin', 'zone_manager']),
  validate(controlRequestReviewSchema), async (req, res) => {
  try {
    const { action, reason } = req.body;
    const request = await prisma.deviceControlRequest.findUnique({
      where: { id: req.params.id },
      include: { device: { include: { building: true } } }
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });

    // Zone access for zone managers
    const { role, zoneIds } = req.user;
    if (role === 'zone_manager' && !zoneIds.includes(request.device.building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const updated = await prisma.deviceControlRequest.update({
      where: { id: req.params.id },
      data: {
        status: action,
        reviewedBy: req.user.userId,
        reviewedAt: new Date(),
        reason
      }
    });

    if (action === 'approved') {
      await prisma.device.update({
        where: { id: request.deviceId },
        data: { status: request.requestedState }
      });
    }

    await auditLog(req.user.userId, `CONTROL_${action.toUpperCase()}`, 'device', request.deviceId,
      { requestId: request.id, reason }, getClientIp(req));

    res.json({ request: updated, message: `Request ${action}` });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/devices/:id
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        building: { include: { zone: { select: { id: true, name: true } } } },
        readings: { take: 20, orderBy: { recordedAt: 'desc' } },
        controlRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            requester: { select: { name: true } },
            reviewer: { select: { name: true } }
          }
        }
      }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Zone access check — non-admin roles may only view devices in their zones
    const { role, zoneIds } = req.user;
    if (role === 'zone_manager' || role === 'field_operator') {
      if (!zoneIds.includes(device.building.zoneId)) {
        return res.status(403).json({ error: 'You do not have access to this zone.' });
      }
    }

    res.json({ device });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/devices/:id/toggle — Low-impact direct toggle
router.patch('/:id/toggle', authenticateJWT, requireRole(['super_admin', 'zone_manager', 'field_operator']), async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { building: true }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Zone access check
    const { role, zoneIds } = req.user;
    if ((role === 'zone_manager' || role === 'field_operator') && !zoneIds.includes(device.building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    if (device.status === 'stale') {
      return res.status(400).json({ error: 'Device is not responding. Cannot send command.' });
    }

    if (device.impactLevel === 'high' && role === 'field_operator') {
      return res.status(400).json({ error: 'High-impact devices require approval. Use request-control endpoint.' });
    }

    const newStatus = device.status === 'online' ? 'controlled_off' : 'online';
    const updated = await prisma.device.update({
      where: { id: req.params.id },
      data: { status: newStatus }
    });

    await auditLog(req.user.userId, 'DEVICE_TOGGLE', 'device', device.id,
      { from: device.status, to: newStatus }, getClientIp(req));

    res.json({ device: updated, message: 'Command sent ✓' });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/devices/:id/request-control — High-impact approval request
router.post('/:id/request-control', authenticateJWT, requireRole(['field_operator']), async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { building: true }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    if (!req.user.zoneIds.includes(device.building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    if (device.status === 'stale') {
      return res.status(400).json({ error: 'Device is not responding. Cannot send command.' });
    }

    const requestedState = device.status === 'online' ? 'controlled_off' : 'online';
    const request = await prisma.deviceControlRequest.create({
      data: {
        deviceId: device.id,
        requestedBy: req.user.userId,
        requestedState,
        status: 'pending'
      },
      include: { device: true, requester: { select: { name: true } } }
    });

    await auditLog(req.user.userId, 'CONTROL_REQUEST', 'device', device.id,
      { requestedState }, getClientIp(req));

    res.status(201).json({ request, message: 'Approval request sent to Zone Manager' });
  } catch (err) {
    console.error('Control request error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
