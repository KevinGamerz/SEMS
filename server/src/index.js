import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import zoneRoutes from './routes/zones.js';
import deviceRoutes from './routes/devices.js';
import readingRoutes from './routes/readings.js';
import alertRoutes from './routes/alerts.js';
import predictionRoutes from './routes/predictions.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { startCronJobs } from './utils/jobs.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));
app.disable('x-powered-by');

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-iot-api-key']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// General API rate limit
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/zones', zoneRoutes);
// NOTE: /api/buildings intentionally aliases the same zoneRoutes router.
// Zone routes handle both /zones and /buildings sub-resources (buildings are nested under zones).
app.use('/api/buildings', zoneRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ingest', readingRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/tariff', predictionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Provide static files from the built client
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// 404 handler for API routes, else serve index.html for client-side routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API route not found' });
  } else {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] SEMS API running on http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
