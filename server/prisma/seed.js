import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.deviceControlRequest.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.alertThreshold.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.report.deleteMany();
  await prisma.device.deleteMany();
  await prisma.building.deleteMany();
  await prisma.zoneAssignment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();

  // ─── Users ───
  const password = await bcrypt.hash('Admin@12345', 12);

  const superAdmin = await prisma.user.create({
    data: { email: 'admin@sems.gov', name: 'Rajesh Kumar', role: 'super_admin', password }
  });
  const zm1 = await prisma.user.create({
    data: { email: 'zone1@sems.gov', name: 'Priya Sharma', role: 'zone_manager', password }
  });
  const zm2 = await prisma.user.create({
    data: { email: 'zone2@sems.gov', name: 'Anil Patel', role: 'zone_manager', password }
  });
  const fo1 = await prisma.user.create({
    data: { email: 'operator1@sems.gov', name: 'Vikram Singh', role: 'field_operator', password }
  });
  const fo2 = await prisma.user.create({
    data: { email: 'operator2@sems.gov', name: 'Neha Gupta', role: 'field_operator', password }
  });
  const auditor = await prisma.user.create({
    data: { email: 'auditor@sems.gov', name: 'Suresh Iyer', role: 'auditor', password }
  });

  console.log('✅ Users created');

  // ─── Zones ───
  const zone1 = await prisma.zone.create({
    data: { name: 'Zone Alpha', description: 'Central business district — government offices and commercial buildings', city: 'District 1' }
  });
  const zone2 = await prisma.zone.create({
    data: { name: 'Zone Beta', description: 'Residential area with community centers and public facilities', city: 'District 1' }
  });
  const zone3 = await prisma.zone.create({
    data: { name: 'Zone Gamma', description: 'Industrial and mixed-use zone with solar installations', city: 'District 1' }
  });

  console.log('✅ Zones created');

  // ─── Zone Assignments ───
  await prisma.zoneAssignment.createMany({
    data: [
      { userId: zm1.id, zoneId: zone1.id },
      { userId: zm2.id, zoneId: zone2.id },
      { userId: zm2.id, zoneId: zone3.id },
      { userId: fo1.id, zoneId: zone1.id },
      { userId: fo2.id, zoneId: zone2.id },
    ]
  });

  console.log('✅ Zone assignments created');

  // ─── Buildings ───
  const buildings = await Promise.all([
    // Zone Alpha
    prisma.building.create({ data: { zoneId: zone1.id, name: 'Municipal Hall', address: '1 Main Street' } }),
    prisma.building.create({ data: { zoneId: zone1.id, name: 'Revenue Office', address: '15 Park Avenue' } }),
    prisma.building.create({ data: { zoneId: zone1.id, name: 'Central Library', address: '8 Knowledge Lane' } }),
    // Zone Beta
    prisma.building.create({ data: { zoneId: zone2.id, name: 'Community Center A', address: '22 Elm Street' } }),
    prisma.building.create({ data: { zoneId: zone2.id, name: 'Public School No. 4', address: '30 Oak Road' } }),
    prisma.building.create({ data: { zoneId: zone2.id, name: 'Health Clinic', address: '42 Maple Drive' } }),
    // Zone Gamma
    prisma.building.create({ data: { zoneId: zone3.id, name: 'Solar Park Building', address: '100 Industrial Road' } }),
    prisma.building.create({ data: { zoneId: zone3.id, name: 'Warehouse Complex', address: '110 Industrial Road' } }),
  ]);

  console.log('✅ Buildings created');

  // ─── Devices ───
  const deviceConfigs = [
    // Municipal Hall
    { buildingIdx: 0, name: 'Main Hall Lights', type: 'light', impact: 'low' },
    { buildingIdx: 0, name: 'Corridor Lighting A', type: 'light', impact: 'low' },
    { buildingIdx: 0, name: 'HVAC Central Unit', type: 'hvac', impact: 'high' },
    { buildingIdx: 0, name: 'Smart Meter MH-01', type: 'smart_meter', impact: 'low' },
    // Revenue Office
    { buildingIdx: 1, name: 'Office Floor Lights', type: 'light', impact: 'low' },
    { buildingIdx: 1, name: 'HVAC Unit R-1', type: 'hvac', impact: 'high' },
    { buildingIdx: 1, name: 'Server Room AC', type: 'hvac', impact: 'high' },
    { buildingIdx: 1, name: 'Smart Meter RO-01', type: 'smart_meter', impact: 'low' },
    // Central Library
    { buildingIdx: 2, name: 'Reading Room Lights', type: 'light', impact: 'low' },
    { buildingIdx: 2, name: 'Library HVAC', type: 'hvac', impact: 'high' },
    { buildingIdx: 2, name: 'Rooftop Solar Panel', type: 'solar_inverter', impact: 'high' },
    // Community Center A
    { buildingIdx: 3, name: 'Auditorium Lights', type: 'light', impact: 'low' },
    { buildingIdx: 3, name: 'Community HVAC', type: 'hvac', impact: 'high' },
    { buildingIdx: 3, name: 'Parking Lot Lamps', type: 'street_lamp', impact: 'low' },
    { buildingIdx: 3, name: 'Smart Meter CC-01', type: 'smart_meter', impact: 'low' },
    // Public School
    { buildingIdx: 4, name: 'Classroom Block Lights', type: 'light', impact: 'low' },
    { buildingIdx: 4, name: 'School HVAC', type: 'hvac', impact: 'high' },
    { buildingIdx: 4, name: 'Playground Lamps', type: 'street_lamp', impact: 'low' },
    // Health Clinic
    { buildingIdx: 5, name: 'Clinic Lighting', type: 'light', impact: 'low' },
    { buildingIdx: 5, name: 'Medical Equipment Power', type: 'other', impact: 'high' },
    { buildingIdx: 5, name: 'Clinic HVAC', type: 'hvac', impact: 'high' },
    // Solar Park
    { buildingIdx: 6, name: 'Solar Array A', type: 'solar_inverter', impact: 'high' },
    { buildingIdx: 6, name: 'Solar Array B', type: 'solar_inverter', impact: 'high' },
    { buildingIdx: 6, name: 'Wind Turbine W-1', type: 'wind_inverter', impact: 'high' },
    { buildingIdx: 6, name: 'Facility Lights', type: 'light', impact: 'low' },
    // Warehouse
    { buildingIdx: 7, name: 'Warehouse Lighting', type: 'light', impact: 'low' },
    { buildingIdx: 7, name: 'Loading Dock Lamps', type: 'street_lamp', impact: 'low' },
    { buildingIdx: 7, name: 'Warehouse HVAC', type: 'hvac', impact: 'high' },
    { buildingIdx: 7, name: 'Smart Meter WH-01', type: 'smart_meter', impact: 'low' },
  ];

  const devices = [];
  for (const cfg of deviceConfigs) {
    const device = await prisma.device.create({
      data: {
        buildingId: buildings[cfg.buildingIdx].id,
        name: cfg.name,
        type: cfg.type,
        impactLevel: cfg.impact,
        status: 'online',
        lastSeenAt: new Date()
      }
    });
    devices.push(device);
  }

  console.log(`✅ ${devices.length} devices created`);

  // ─── Historical Readings (30 days) ───
  console.log('📊 Generating 30 days of historical readings (sampling every 4 hours)...');
  const now = new Date();
  let readingCount = 0;
  let deviceIdx = 0;

  for (let day = 30; day >= 0; day--) {
    const dayBatch = [];
    for (let hour = 0; hour < 24; hour += 4) {
      deviceIdx = 0;
      for (const device of devices) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - day);
        timestamp.setHours(hour, 0, deviceIdx, 0); // Use deviceIdx as seconds for uniqueness
        timestamp.setMilliseconds(0);

        let kwh;
        switch (device.type) {
          case 'hvac': kwh = (hour >= 8 && hour <= 18) ? 12 + Math.random() * 10 : 2 + Math.random() * 4; break;
          case 'light': kwh = (hour >= 6 && hour <= 22) ? 1 + Math.random() * 2.5 : 0.2 + Math.random() * 0.5; break;
          case 'street_lamp': kwh = (hour >= 18 || hour <= 6) ? 1.5 + Math.random() * 1.5 : 0.05; break;
          case 'smart_meter': kwh = 4 + Math.random() * 12; break;
          case 'solar_inverter':
            kwh = (hour >= 7 && hour <= 17) ? (6 + Math.random() * 12) * (1 - Math.abs(hour - 12) / 6) : 0;
            break;
          case 'wind_inverter': kwh = 2 + Math.random() * 8; break;
          default: kwh = 1 + Math.random() * 5;
        }

        const dayOfWeek = timestamp.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) kwh *= 0.6;

        const energySource = device.type === 'solar_inverter' ? 'solar' :
                             device.type === 'wind_inverter' ? 'wind' : 'grid';

        dayBatch.push({
          deviceId: device.id,
          kwh: Math.round(Math.max(0, kwh) * 10000) / 10000,
          energySource,
          recordedAt: timestamp,
          ingestionType: 'iot'
        });
        deviceIdx++;
      }
    }
    // Insert each day's readings
    try {
      await prisma.reading.createMany({ data: dayBatch });
      readingCount += dayBatch.length;
    } catch (e) {
      // Try one by one if batch fails
      for (const r of dayBatch) {
        try { await prisma.reading.create({ data: r }); readingCount++; } catch {}
      }
    }
    if (day % 5 === 0) console.log(`   Day -${day}: ${readingCount} readings so far...`);
  }

  console.log(`✅ ${readingCount} readings generated`);

  // ─── Alert Thresholds ───
  await prisma.alertThreshold.createMany({
    data: [
      { zoneId: zone1.id, thresholdKwh: 500, createdBy: superAdmin.id },
      { zoneId: zone2.id, thresholdKwh: 400, createdBy: superAdmin.id },
      { zoneId: zone3.id, thresholdKwh: 600, createdBy: superAdmin.id },
      { deviceId: devices[2].id, thresholdKwh: 25, createdBy: zm1.id }, // HVAC Central
      { deviceId: devices[5].id, thresholdKwh: 22, createdBy: zm1.id }, // HVAC R-1
    ]
  });

  console.log('✅ Alert thresholds created');

  // ─── Sample Alerts ───
  await prisma.alert.createMany({
    data: [
      {
        zoneId: zone1.id, buildingId: buildings[0].id, deviceId: devices[2].id,
        severity: 'critical', message: 'HVAC Central Unit consumption spike — 28.5 kWh exceeds threshold 25 kWh',
        status: 'new'
      },
      {
        zoneId: zone1.id, buildingId: buildings[1].id, deviceId: devices[6].id,
        severity: 'warning', message: 'Server Room AC running above baseline — 23.2 kWh',
        status: 'acknowledged', acknowledgedBy: zm1.id, acknowledgedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        zoneId: zone2.id, buildingId: buildings[3].id, deviceId: devices[13].id,
        severity: 'info', message: 'Parking Lot Lamps consumption slightly above normal levels',
        status: 'resolved', acknowledgedBy: zm2.id, acknowledgedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        resolvedBy: zm2.id, resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        zoneId: zone3.id, buildingId: buildings[6].id, deviceId: devices[21].id,
        severity: 'warning', message: 'Solar Array A generation below expected output for current conditions',
        status: 'new'
      }
    ]
  });

  console.log('✅ Sample alerts created');

  // ─── Tariff Rate ───
  await prisma.systemConfig.create({
    data: { key: 'tariff_rate', value: '8.5' }
  });

  console.log('✅ System config set');
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('📋 Login credentials (all accounts):');
  console.log('   Password: Admin@12345');
  console.log('');
  console.log('   Super Admin:     admin@sems.gov');
  console.log('   Zone Manager 1:  zone1@sems.gov  (Zone Alpha)');
  console.log('   Zone Manager 2:  zone2@sems.gov  (Zone Beta, Gamma)');
  console.log('   Field Operator:  operator1@sems.gov (Zone Alpha)');
  console.log('   Field Operator:  operator2@sems.gov (Zone Beta)');
  console.log('   Auditor:         auditor@sems.gov');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
