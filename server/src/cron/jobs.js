import cron from 'node-cron';
import prisma from '../db.js';
import { generateIoTReadings, generateUtilityData, generateInverterData } from '../simulators/iotSimulator.js';
import { evaluateThresholds } from '../services/alertService.js';
import { auditLog } from '../utils/helpers.js';

/**
 * Ingest readings into DB, check for duplicates and anomalies, evaluate thresholds
 */
async function ingestReadings(readings, ingestionType) {
  let inserted = 0, duplicates = 0, anomalies = 0;

  for (const reading of readings) {
    if (reading.kwh < 0) {
      anomalies++;
      await auditLog(null, 'DATA_ANOMALY', 'device', reading.deviceId,
        { kwh: reading.kwh, type: ingestionType });
      continue;
    }

    try {
      await prisma.reading.create({
        data: {
          deviceId: reading.deviceId,
          kwh: reading.kwh,
          energySource: reading.energySource,
          recordedAt: new Date(reading.recordedAt),
          ingestionType: ingestionType
        }
      });
      inserted++;

      await prisma.device.update({
        where: { id: reading.deviceId },
        data: { lastSeenAt: new Date(), status: 'online' }
      });

      await evaluateThresholds(reading);
    } catch (err) {
      if (err.code === 'P2002') duplicates++;
    }
  }

  return { inserted, duplicates, anomalies };
}

/**
 * Detect stale devices (no data for 15+ min) and mark them
 */
async function detectStaleDevices() {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const staleDevices = await prisma.device.updateMany({
    where: {
      status: 'online',
      OR: [
        { lastSeenAt: { lt: fifteenMinAgo } },
        { lastSeenAt: null }
      ]
    },
    data: { status: 'stale' }
  });

  if (staleDevices.count > 0) {
    console.log(`[CRON] Marked ${staleDevices.count} devices as stale`);
  }
}

export function startCronJobs() {
  // IoT Simulator — every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[CRON] Running IoT simulator...');
      const readings = await generateIoTReadings();
      const result = await ingestReadings(readings, 'iot');
      console.log(`[CRON] IoT: ${result.inserted} inserted, ${result.duplicates} duplicates, ${result.anomalies} anomalies`);
    } catch (err) {
      console.error('[CRON] IoT simulator error:', err.message);
    }
  });

  // Utility API Mock — every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('[CRON] Running utility API mock...');
      const readings = await generateUtilityData();
      const result = await ingestReadings(readings, 'utility_api');
      console.log(`[CRON] Utility: ${result.inserted} inserted`);
    } catch (err) {
      console.error('[CRON] Utility mock error:', err.message);
    }
  });

  // Inverter API Mock — every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[CRON] Running inverter API mock...');
      const readings = await generateInverterData();
      const result = await ingestReadings(readings, 'inverter_api');
      console.log(`[CRON] Inverter: ${result.inserted} inserted, ${result.anomalies} anomalies`);
    } catch (err) {
      console.error('[CRON] Inverter mock error:', err.message);
    }
  });

  // Stale Device Detection — every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await detectStaleDevices();
    } catch (err) {
      console.error('[CRON] Stale detection error:', err.message);
    }
  });

  // Run IoT simulation immediately on start for demo purposes
  setTimeout(async () => {
    try {
      const readings = await generateIoTReadings();
      const result = await ingestReadings(readings, 'iot');
      console.log(`[INIT] Initial IoT data: ${result.inserted} readings generated`);
    } catch (err) {
      console.error('[INIT] Initial IoT generation error:', err.message);
    }
  }, 3000);

  console.log('[CRON] Background jobs scheduled');
}
