import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, requireIoTApiKey, validate, validateQuery } from '../middleware/auth.js';
import { iotLimiter } from '../middleware/rateLimiter.js';
import { manualReadingSchema, iotBatchSchema, readingsQuerySchema } from '../utils/schemas.js';
import { evaluateThresholds } from '../services/alertService.js';
import { auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// POST /api/ingest/iot — IoT simulator batch ingestion
router.post('/iot', requireIoTApiKey, iotLimiter, validate(iotBatchSchema), async (req, res) => {
  try {
    const { readings } = req.body;
    let inserted = 0, duplicates = 0, anomalies = 0;

    for (const reading of readings) {
      // Check for negative values (anomaly from inverters)
      if (reading.kwh < 0) {
        anomalies++;
        await auditLog(null, 'DATA_ANOMALY', 'device', reading.deviceId,
          { kwh: reading.kwh, reason: 'Negative value' });
        continue;
      }

      try {
        await prisma.reading.create({
          data: {
            deviceId: reading.deviceId,
            kwh: reading.kwh,
            energySource: reading.energySource,
            recordedAt: new Date(reading.recordedAt),
            ingestionType: 'iot'
          }
        });
        inserted++;

        // Update device last_seen_at and set online
        await prisma.device.update({
          where: { id: reading.deviceId },
          data: { lastSeenAt: new Date(), status: 'online' }
        });

        // Evaluate alert thresholds
        await evaluateThresholds(reading);
      } catch (err) {
        if (err.code === 'P2002') {
          duplicates++;
        } else {
          console.error('IoT insert error:', err.message);
        }
      }
    }

    res.json({ inserted, duplicates, anomalies });
  } catch (err) {
    console.error('IoT ingestion error:', err);
    res.status(500).json({ error: 'Ingestion failed' });
  }
});

// POST /api/ingest/manual — Manual data entry by Field Operator
router.post('/manual', authenticateJWT, requireRole(['super_admin', 'zone_manager', 'field_operator']),
  validate(manualReadingSchema), async (req, res) => {
  try {
    const { deviceId, kwh, energySource, recordedAt, notes } = req.body;

    // Verify device exists and user has zone access
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { building: true }
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const { role, zoneIds, userId } = req.user;
    if ((role === 'zone_manager' || role === 'field_operator') && !zoneIds.includes(device.building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const reading = await prisma.reading.create({
      data: {
        deviceId,
        kwh,
        energySource,
        recordedAt: new Date(recordedAt),
        ingestionType: 'manual',
        enteredBy: userId,
        notes
      }
    });

    await auditLog(userId, 'MANUAL_ENTRY', 'reading', reading.id,
      { deviceId, kwh }, getClientIp(req));

    // Evaluate alert thresholds
    await evaluateThresholds({ deviceId, kwh });

    res.status(201).json({ reading, message: 'Reading saved.' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate reading for this device and timestamp' });
    }
    console.error('Manual entry error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/readings
router.get('/', authenticateJWT, validateQuery(readingsQuerySchema), async (req, res) => {
  try {
    const { zoneId, deviceId, buildingId, dateFrom, dateTo, energySource, page, limit } = req.query;
    const { role, zoneIds } = req.user;

    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (energySource) where.energySource = energySource;
    if (dateFrom || dateTo) {
      where.recordedAt = {};
      if (dateFrom) where.recordedAt.gte = new Date(dateFrom);
      if (dateTo) where.recordedAt.lte = new Date(dateTo);
    }

    // Scope by building/zone
    if (buildingId) {
      const devs = await prisma.device.findMany({ where: { buildingId }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    } else if (zoneId) {
      const bldgs = await prisma.building.findMany({ where: { zoneId }, select: { id: true } });
      const devs = await prisma.device.findMany({ where: { buildingId: { in: bldgs.map(b => b.id) } }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    } else if (role === 'zone_manager' || role === 'field_operator') {
      const bldgs = await prisma.building.findMany({ where: { zoneId: { in: zoneIds } }, select: { id: true } });
      const devs = await prisma.device.findMany({ where: { buildingId: { in: bldgs.map(b => b.id) } }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    }

    const [readings, total] = await Promise.all([
      prisma.reading.findMany({
        where,
        include: {
          device: {
            select: { name: true, type: true, building: { select: { name: true, zone: { select: { name: true } } } } }
          }
        },
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.reading.count({ where })
    ]);

    res.json({ readings, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get readings error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
