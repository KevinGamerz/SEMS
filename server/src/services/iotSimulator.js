import prisma from '../db.js';

/**
 * Generate realistic energy readings for all registered devices.
 * Called by cron every 5 minutes.
 */
export async function generateIoTReadings() {
  const devices = await prisma.device.findMany({
    where: { status: { not: 'controlled_off' } },
    include: { building: true }
  });

  const now = new Date();
  const hour = now.getHours();
  const readings = [];

  for (const device of devices) {
    let baseKwh;
    // Realistic consumption patterns
    switch (device.type) {
      case 'hvac':
        // Higher during business hours, lower at night
        baseKwh = (hour >= 8 && hour <= 18) ? 15 + Math.random() * 10 : 3 + Math.random() * 5;
        break;
      case 'light':
        baseKwh = (hour >= 6 && hour <= 22) ? 1.5 + Math.random() * 2 : 0.3 + Math.random() * 0.5;
        break;
      case 'street_lamp':
        baseKwh = (hour >= 18 || hour <= 6) ? 2 + Math.random() * 1.5 : 0.1;
        break;
      case 'smart_meter':
        baseKwh = 5 + Math.random() * 15;
        break;
      case 'solar_inverter':
        // Only generates during daylight
        if (hour >= 7 && hour <= 17) {
          const peakFactor = 1 - Math.abs(hour - 12) / 6;
          baseKwh = (8 + Math.random() * 12) * peakFactor;
        } else {
          baseKwh = 0;
        }
        break;
      case 'wind_inverter':
        baseKwh = 3 + Math.random() * 8;
        break;
      default:
        baseKwh = 2 + Math.random() * 5;
    }

    // Add some noise
    const noise = (Math.random() - 0.5) * baseKwh * 0.2;
    const kwh = Math.max(0, Math.round((baseKwh + noise) * 10000) / 10000);

    const energySource = ['solar_inverter'].includes(device.type) ? 'solar' :
                         ['wind_inverter'].includes(device.type) ? 'wind' : 'grid';

    readings.push({
      deviceId: device.id,
      kwh,
      energySource,
      recordedAt: now.toISOString()
    });
  }

  return readings;
}

/**
 * Generate mock utility API data
 */
export async function generateUtilityData() {
  const zones = await prisma.zone.findMany({
    include: { buildings: { include: { devices: { where: { type: 'smart_meter' } } } } }
  });

  const readings = [];
  const now = new Date();

  for (const zone of zones) {
    for (const building of zone.buildings) {
      for (const device of building.devices) {
        readings.push({
          deviceId: device.id,
          kwh: Math.round((10 + Math.random() * 20) * 10000) / 10000,
          energySource: 'grid',
          recordedAt: now.toISOString(),
          ingestionType: 'utility_api'
        });
      }
    }
  }
  return readings;
}

/**
 * Generate mock inverter API data
 */
export async function generateInverterData() {
  const devices = await prisma.device.findMany({
    where: { type: { in: ['solar_inverter', 'wind_inverter'] } }
  });

  const readings = [];
  const now = new Date();
  const hour = now.getHours();

  for (const device of devices) {
    let kwh;
    if (device.type === 'solar_inverter') {
      if (hour >= 7 && hour <= 17) {
        const peakFactor = 1 - Math.abs(hour - 12) / 6;
        kwh = (10 + Math.random() * 15) * peakFactor;
      } else {
        kwh = 0;
      }
    } else {
      kwh = 5 + Math.random() * 10;
    }

    // Simulate occasional negative/anomalous value (2% chance)
    if (Math.random() < 0.02) {
      kwh = -(Math.random() * 5);
    }

    readings.push({
      deviceId: device.id,
      kwh: Math.round(kwh * 10000) / 10000,
      energySource: device.type === 'solar_inverter' ? 'solar' : 'wind',
      recordedAt: now.toISOString(),
      ingestionType: 'inverter_api'
    });
  }
  return readings;
}
