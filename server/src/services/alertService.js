import prisma from '../db.js';

const ALERT_COOLDOWN_MINUTES = 30;

export async function evaluateThresholds(reading) {
  // Find applicable thresholds for this device
  const device = await prisma.device.findUnique({
    where: { id: reading.deviceId },
    include: { building: true }
  });
  if (!device) return;

  const thresholds = await prisma.alertThreshold.findMany({
    where: {
      OR: [
        { deviceId: device.id },
        { buildingId: device.buildingId },
        { zoneId: device.building.zoneId }
      ]
    }
  });

  for (const threshold of thresholds) {
    if (reading.kwh >= threshold.thresholdKwh) {
      // Check cooldown
      const cooldownTime = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000);
      const recentAlert = await prisma.alert.findFirst({
        where: {
          deviceId: device.id,
          thresholdId: threshold.id,
          createdAt: { gte: cooldownTime }
        }
      });

      if (!recentAlert) {
        const severity = reading.kwh >= threshold.thresholdKwh * 1.5 ? 'critical' :
                         reading.kwh >= threshold.thresholdKwh * 1.2 ? 'warning' : 'info';

        await prisma.alert.create({
          data: {
            zoneId: device.building.zoneId,
            buildingId: device.buildingId,
            deviceId: device.id,
            thresholdId: threshold.id,
            severity,
            message: `Device "${device.name}" reading ${reading.kwh} kWh exceeds threshold ${threshold.thresholdKwh} kWh`,
            status: 'new'
          }
        });
      }
    }
  }
}

export async function getAlertCounts(zoneIds = null) {
  const where = { status: { in: ['new', 'acknowledged'] } };
  if (zoneIds) {
    where.zoneId = { in: zoneIds };
  }
  return prisma.alert.count({ where });
}
