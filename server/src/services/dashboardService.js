import prisma from '../db.js';

export async function getCityDashboard() {
  const zones = await prisma.zone.findMany({
    include: {
      buildings: {
        include: {
          devices: {
            include: {
              readings: {
                where: {
                  recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
              }
            }
          }
        }
      },
      alerts: {
        where: { status: { in: ['new', 'acknowledged'] } }
      }
    }
  });

  let totalKwh = 0;
  let renewableKwh = 0;
  let activeAlerts = 0;
  const zoneData = [];

  for (const zone of zones) {
    let zoneKwh = 0;
    let zoneRenewable = 0;
    let zoneDeviceCount = 0;
    let zoneBuildingCount = zone.buildings.length;
    let staleDevices = 0;

    for (const building of zone.buildings) {
      for (const device of building.devices) {
        zoneDeviceCount++;
        if (device.status === 'stale') staleDevices++;
        for (const reading of device.readings) {
          zoneKwh += reading.kwh;
          if (['solar', 'wind'].includes(reading.energySource)) {
            zoneRenewable += reading.kwh;
          }
        }
      }
    }

    totalKwh += zoneKwh;
    renewableKwh += zoneRenewable;
    activeAlerts += zone.alerts.length;

    const health = staleDevices > 2 ? 'critical' : staleDevices > 0 ? 'warning' : 'healthy';

    zoneData.push({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      kwh: Math.round(zoneKwh * 100) / 100,
      renewableKwh: Math.round(zoneRenewable * 100) / 100,
      buildingCount: zoneBuildingCount,
      deviceCount: zoneDeviceCount,
      alertCount: zone.alerts.length,
      health
    });
  }

  // 7-day consumption trend
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendReadings = await prisma.reading.findMany({
    where: { recordedAt: { gte: sevenDaysAgo } },
    orderBy: { recordedAt: 'asc' }
  });

  const trendMap = {};
  trendReadings.forEach(r => {
    const day = r.recordedAt.toISOString().split('T')[0];
    if (!trendMap[day]) trendMap[day] = { grid: 0, solar: 0, wind: 0 };
    const src = ['solar', 'wind'].includes(r.energySource) ? r.energySource : 'grid';
    trendMap[day][src] += r.kwh;
  });

  const trend = Object.entries(trendMap).sort().map(([date, vals]) => ({
    date,
    grid: Math.round(vals.grid * 100) / 100,
    solar: Math.round(vals.solar * 100) / 100,
    wind: Math.round(vals.wind * 100) / 100,
    total: Math.round((vals.grid + vals.solar + vals.wind) * 100) / 100
  }));

  // Get tariff for cost estimate
  const tariffConfig = await prisma.systemConfig.findUnique({ where: { key: 'tariff_rate' } });
  const tariffRate = tariffConfig ? parseFloat(tariffConfig.value) : 8.5;

  // Latest alerts
  const latestAlerts = await prisma.alert.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      zone: { select: { name: true } },
      building: { select: { name: true } },
      device: { select: { name: true } }
    }
  });

  return {
    kpis: {
      totalKwh: Math.round(totalKwh * 100) / 100,
      renewablePercent: totalKwh > 0 ? Math.round((renewableKwh / totalKwh) * 100) : 0,
      activeAlerts,
      costEstimate: Math.round(totalKwh * tariffRate * 100) / 100,
      tariffRate
    },
    zones: zoneData,
    trend,
    latestAlerts
  };
}

export async function getZoneDashboard(zoneId) {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    include: {
      buildings: {
        include: {
          devices: {
            include: {
              readings: {
                where: {
                  recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
              }
            }
          }
        }
      },
      alerts: {
        where: { status: { in: ['new', 'acknowledged'] } }
      }
    }
  });

  if (!zone) return null;

  let zoneKwh = 0, renewableKwh = 0;
  const buildingData = [];
  let onlineDevices = 0, totalDevices = 0;

  for (const building of zone.buildings) {
    let buildingKwh = 0;
    let buildingDeviceCount = building.devices.length;
    let onlineCount = 0;
    let staleCount = 0;

    for (const device of building.devices) {
      totalDevices++;
      if (device.status === 'online') { onlineDevices++; onlineCount++; }
      if (device.status === 'stale') staleCount++;
      for (const reading of device.readings) {
        buildingKwh += reading.kwh;
        zoneKwh += reading.kwh;
        if (['solar', 'wind'].includes(reading.energySource)) {
          renewableKwh += reading.kwh;
        }
      }
    }

    const health = staleCount > 0 ? 'warning' : 'healthy';
    buildingData.push({
      id: building.id,
      name: building.name,
      address: building.address,
      kwh: Math.round(buildingKwh * 100) / 100,
      deviceCount: buildingDeviceCount,
      onlineDevices: onlineCount,
      health
    });
  }

  // 7-day zone trend
  const deviceIds = zone.buildings.flatMap(b => b.devices.map(d => d.id));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendReadings = await prisma.reading.findMany({
    where: {
      deviceId: { in: deviceIds },
      recordedAt: { gte: sevenDaysAgo }
    },
    orderBy: { recordedAt: 'asc' }
  });

  const trendMap = {};
  const sourceBreakdown = { grid: 0, solar: 0, wind: 0 };
  trendReadings.forEach(r => {
    const day = r.recordedAt.toISOString().split('T')[0];
    if (!trendMap[day]) trendMap[day] = 0;
    trendMap[day] += r.kwh;
    const src = ['solar', 'wind'].includes(r.energySource) ? r.energySource : 'grid';
    sourceBreakdown[src] += r.kwh;
  });

  const trend = Object.entries(trendMap).sort().map(([date, kwh]) => ({
    date,
    kwh: Math.round(kwh * 100) / 100
  }));

  const tariffConfig = await prisma.systemConfig.findUnique({ where: { key: 'tariff_rate' } });
  const tariffRate = tariffConfig ? parseFloat(tariffConfig.value) : 8.5;

  return {
    zone: { id: zone.id, name: zone.name, description: zone.description },
    kpis: {
      zoneKwh: Math.round(zoneKwh * 100) / 100,
      renewableKwh: Math.round(renewableKwh * 100) / 100,
      activeAlerts: zone.alerts.length,
      buildingsActive: zone.buildings.length,
      onlineDevices,
      totalDevices,
      costEstimate: Math.round(zoneKwh * tariffRate * 100) / 100
    },
    buildings: buildingData,
    trend,
    energySources: {
      grid: Math.round(sourceBreakdown.grid * 100) / 100,
      solar: Math.round(sourceBreakdown.solar * 100) / 100,
      wind: Math.round(sourceBreakdown.wind * 100) / 100
    }
  };
}
