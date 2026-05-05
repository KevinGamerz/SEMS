import prisma from '../db.js';

/**
 * Generate forecast using weighted moving average + linear regression
 * @param {string} zoneId
 * @param {number} forecastDays - 7 or 30
 */
export async function generateForecast(zoneId, forecastDays = 7) {
  // Get devices in zone
  const buildings = await prisma.building.findMany({
    where: { zoneId },
    select: { id: true }
  });
  const buildingIds = buildings.map(b => b.id);

  const devices = await prisma.device.findMany({
    where: { buildingId: { in: buildingIds } },
    select: { id: true }
  });
  const deviceIds = devices.map(d => d.id);

  // Get historical daily aggregates (past 90 days max)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const readings = await prisma.reading.findMany({
    where: {
      deviceId: { in: deviceIds },
      recordedAt: { gte: startDate }
    },
    orderBy: { recordedAt: 'asc' }
  });

  // Aggregate by day
  const dailyMap = {};
  readings.forEach(r => {
    const day = r.recordedAt.toISOString().split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + r.kwh;
  });

  const days = Object.keys(dailyMap).sort();
  const values = days.map(d => dailyMap[d]);

  if (days.length < 7) {
    return { insufficient: true, daysAvailable: days.length };
  }

  // Historical data for response
  const historical = days.map((d, i) => ({
    date: d,
    kwh: Math.round(values[i] * 100) / 100
  }));

  // Linear regression for trend
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0, denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Weighted moving average (last 7 days weighted more)
  const windowSize = Math.min(7, values.length);
  const recentValues = values.slice(-windowSize);
  const weights = recentValues.map((_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const wma = recentValues.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;

  // Generate forecast
  const forecast = [];
  const lastDate = new Date(days[days.length - 1]);

  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Blend linear regression with WMA 
    const linearPred = slope * (n + i - 1) + intercept;
    const predicted = (linearPred * 0.3 + wma * 0.7);

    // Confidence band widens with time
    const variance = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const confidenceWidth = stdDev * 0.5 * Math.sqrt(i);

    forecast.push({
      date: dateStr,
      predicted: Math.round(Math.max(0, predicted) * 100) / 100,
      min: Math.round(Math.max(0, predicted - confidenceWidth) * 100) / 100,
      max: Math.round((predicted + confidenceWidth) * 100) / 100
    });
  }

  // Get tariff rate
  const tariffConfig = await prisma.systemConfig.findUnique({
    where: { key: 'tariff_rate' }
  });
  const tariffRate = tariffConfig ? parseFloat(tariffConfig.value) : 8.5;

  const totalPredicted = forecast.reduce((sum, f) => sum + f.predicted, 0);
  const predictedCost = Math.round(totalPredicted * tariffRate * 100) / 100;

  // Previous period comparison
  const prevPeriodValues = values.slice(-(forecastDays));
  const prevTotal = prevPeriodValues.reduce((a, b) => a + b, 0);
  const changePercent = prevTotal > 0 ?
    Math.round(((totalPredicted - prevTotal) / prevTotal) * 100) : 0;

  return {
    insufficient: false,
    historical,
    forecast,
    summary: {
      totalPredicted: Math.round(totalPredicted * 100) / 100,
      predictedCost,
      tariffRate,
      changePercent,
      forecastDays
    }
  };
}
