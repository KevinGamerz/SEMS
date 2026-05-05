import { Router } from 'express';
import prisma from '../db.js';
import { authenticateJWT, requireRole, requireZoneAccess } from '../middleware/auth.js';

const router = Router();

// GET /api/zones
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { role, zoneIds } = req.user;
    let where = {};
    if (role === 'zone_manager' || role === 'field_operator') {
      where.id = { in: zoneIds };
    }

    const zones = await prisma.zone.findMany({
      where,
      include: {
        buildings: { select: { id: true, name: true } },
        _count: { select: { buildings: true, alerts: true } }
      }
    });
    res.json({ zones });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/zones/:id
router.get('/:id', authenticateJWT, requireZoneAccess, async (req, res) => {
  try {
    const zone = await prisma.zone.findUnique({
      where: { id: req.params.id },
      include: {
        buildings: {
          include: {
            devices: { select: { id: true, name: true, type: true, status: true } }
          }
        }
      }
    });
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    res.json({ zone });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/zones/:id/buildings
router.get('/:id/buildings', authenticateJWT, requireZoneAccess, async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { zoneId: req.params.id },
      include: {
        _count: { select: { devices: true } },
        devices: { select: { id: true, name: true, type: true, status: true } }
      }
    });
    res.json({ buildings });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/buildings/:buildingId  (mounted at /api/buildings in index.js)
router.get('/:buildingId', authenticateJWT, async (req, res) => {
  try {
    const building = await prisma.building.findUnique({
      where: { id: req.params.buildingId },
      include: {
        zone: { select: { id: true, name: true } },
        devices: {
          include: {
            readings: {
              take: 10,
              orderBy: { recordedAt: 'desc' }
            }
          }
        }
      }
    });
    if (!building) return res.status(404).json({ error: 'Building not found' });

    // Check zone access for non-admin users
    const { role, zoneIds } = req.user;
    if ((role === 'zone_manager' || role === 'field_operator') && !zoneIds.includes(building.zoneId)) {
      return res.status(403).json({ error: 'You do not have access to this zone.' });
    }

    res.json({ building });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
