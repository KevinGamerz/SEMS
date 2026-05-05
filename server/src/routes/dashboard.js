import { Router } from 'express';
import { authenticateJWT, requireRole, requireZoneAccess } from '../middleware/auth.js';
import { getCityDashboard, getZoneDashboard } from '../services/dashboardService.js';

const router = Router();

// GET /api/dashboard/city
router.get('/city', authenticateJWT, requireRole(['super_admin']), async (req, res) => {
  try {
    const data = await getCityDashboard();
    res.json(data);
  } catch (err) {
    console.error('City dashboard error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/dashboard/zone/:id
router.get('/zone/:id', authenticateJWT, requireZoneAccess, async (req, res) => {
  try {
    const data = await getZoneDashboard(req.params.id);
    if (!data) return res.status(404).json({ error: 'Zone not found' });
    res.json(data);
  } catch (err) {
    console.error('Zone dashboard error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;
