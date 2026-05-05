import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, validate } from '../middleware/auth.js';
import { reportLimiter } from '../middleware/rateLimiter.js';
import { reportSchema } from '../utils/schemas.js';
import { auditLog, getClientIp } from '../utils/helpers.js';

const router = Router();

// POST /api/reports/generate
router.post('/generate', authenticateJWT, requireRole(['super_admin', 'zone_manager']),
  reportLimiter, validate(reportSchema), async (req, res) => {
  try {
    const { zoneId, dateFrom, dateTo, energySource, buildingId, deviceCategory } = req.body;

    // Build query for row count estimate
    const where = {};
    if (dateFrom || dateTo) {
      where.recordedAt = {};
      if (dateFrom) where.recordedAt.gte = new Date(dateFrom);
      if (dateTo) where.recordedAt.lte = new Date(dateTo);
    }
    if (energySource) where.energySource = energySource;

    if (buildingId) {
      const devs = await prisma.device.findMany({ where: { buildingId }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    } else if (zoneId) {
      const bldgs = await prisma.building.findMany({ where: { zoneId }, select: { id: true } });
      const devs = await prisma.device.findMany({ where: { buildingId: { in: bldgs.map(b => b.id) } }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    }

    if (deviceCategory) {
      const devs = await prisma.device.findMany({
        where: { type: deviceCategory, ...(where.deviceId ? { id: where.deviceId } : {}) },
        select: { id: true }
      });
      where.deviceId = { in: devs.map(d => d.id) };
    }

    const rowCount = await prisma.reading.count({ where });

    const report = await prisma.report.create({
      data: {
        generatedBy: req.user.userId,
        zoneId,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        filters: JSON.stringify({ energySource, buildingId, deviceCategory }),
        rowCount,
        status: 'ready'
      }
    });

    await auditLog(req.user.userId, 'GENERATE_REPORT', 'report', report.id,
      { rowCount }, getClientIp(req));

    res.status(201).json({ report, rowCount });
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports
// Auditors can list reports (read-only). Field operators are excluded at the middleware level.
router.get('/', authenticateJWT, requireRole(['super_admin', 'zone_manager', 'auditor']), async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    const where = {};
    if (role === 'zone_manager') where.zoneId = { in: zoneIds };

    const reports = await prisma.report.findMany({
      where,
      include: {
        user: { select: { name: true } },
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports/:id — Get report data
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { zone: { select: { name: true } }, user: { select: { name: true } } }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const filters = report.filters ? JSON.parse(report.filters) : {};

    // Get actual data
    const where = {};
    if (report.dateFrom || report.dateTo) {
      where.recordedAt = {};
      if (report.dateFrom) where.recordedAt.gte = report.dateFrom;
      if (report.dateTo) where.recordedAt.lte = report.dateTo;
    }
    if (filters.energySource) where.energySource = filters.energySource;

    if (filters.buildingId) {
      const devs = await prisma.device.findMany({ where: { buildingId: filters.buildingId }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    } else if (report.zoneId) {
      const bldgs = await prisma.building.findMany({ where: { zoneId: report.zoneId }, select: { id: true } });
      const devs = await prisma.device.findMany({ where: { buildingId: { in: bldgs.map(b => b.id) } }, select: { id: true } });
      where.deviceId = { in: devs.map(d => d.id) };
    }

    // Cap at 5000 rows to prevent memory exhaustion; streaming export should be used for larger datasets
    const readings = await prisma.reading.findMany({
      where,
      include: {
        device: { select: { name: true, type: true, building: { select: { name: true, zone: { select: { name: true } } } } } }
      },
      orderBy: { recordedAt: 'desc' },
      take: 5000
    });

    // Aggregate summary
    let totalKwh = 0;
    const sourceBreakdown = {};
    const dailyAgg = {};

    readings.forEach(r => {
      totalKwh += r.kwh;
      sourceBreakdown[r.energySource] = (sourceBreakdown[r.energySource] || 0) + r.kwh;
      const day = r.recordedAt.toISOString().split('T')[0];
      dailyAgg[day] = (dailyAgg[day] || 0) + r.kwh;
    });

    const dailyData = Object.entries(dailyAgg).sort().map(([date, kwh]) => ({
      date, kwh: Math.round(kwh * 100) / 100
    }));

    res.json({
      report,
      summary: {
        totalKwh: Math.round(totalKwh * 100) / 100,
        readingCount: readings.length,
        sourceBreakdown,
        dailyData
      },
      readings: readings.slice(0, 100) // First 100 for table preview
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
