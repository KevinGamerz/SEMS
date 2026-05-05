import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, validate } from '../middleware/auth.js';
import { tariffSchema } from '../utils/schemas.js';
import { generateForecast } from '../services/predictionService.js';

const router = Router();

// GET /api/predictions?zoneId=&days=7|30
router.get('/', authenticateJWT, requireRole(['super_admin', 'zone_manager']), async (req, res) => {
  try {
    const { zoneId, days = '7' } = req.query;
    const { role, zoneIds } = req.user;

    let targetZoneId = zoneId;
    if (!targetZoneId) {
      if (role === 'zone_manager') {
        targetZoneId = zoneIds[0];
      } else {
        const zones = await prisma.zone.findMany({ take: 1 });
        targetZoneId = zones[0]?.id;
      }
    }

    if (!targetZoneId) return res.status(400).json({ error: 'Zone ID required' });
    if (role === 'zone_manager' && !zoneIds.includes(targetZoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    const forecast = await generateForecast(targetZoneId, parseInt(days));
    res.json(forecast);
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/tariff
router.get('/tariff', authenticateJWT, async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'tariff_rate' } });
    res.json({ rate: config ? parseFloat(config.value) : 8.5 });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/tariff
router.patch('/tariff', authenticateJWT, requireRole(['super_admin']), validate(tariffSchema), async (req, res) => {
  try {
    const { rate } = req.body;
    await prisma.systemConfig.upsert({
      where: { key: 'tariff_rate' },
      update: { value: String(rate) },
      create: { key: 'tariff_rate', value: String(rate) }
    });
    res.json({ rate, message: 'Tariff rate updated' });
  } catch (err) {
    console.error('Tariff update error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
