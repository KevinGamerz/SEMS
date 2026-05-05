import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character')
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(10).max(128),
  role: z.enum(['super_admin', 'zone_manager', 'field_operator', 'auditor']),
  zoneIds: z.array(z.string().uuid()).optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['super_admin', 'zone_manager', 'field_operator', 'auditor']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  zoneIds: z.array(z.string().uuid()).optional()
});

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['light', 'hvac', 'street_lamp', 'solar_inverter', 'wind_inverter', 'smart_meter', 'other']),
  impactLevel: z.enum(['low', 'high']),
  buildingId: z.string().uuid()
});

export const manualReadingSchema = z.object({
  deviceId: z.string().uuid(),
  kwh: z.number().positive().max(99999.9999),
  energySource: z.enum(['grid', 'solar', 'wind', 'manual']),
  recordedAt: z.string().datetime().refine(val => new Date(val) <= new Date(), {
    message: "Timestamp cannot be in the future"
  }),
  notes: z.string().max(500).optional()
}).strict();

export const iotReadingSchema = z.object({
  deviceId: z.string().uuid(),
  kwh: z.number().min(0).max(99999.9999),
  energySource: z.enum(['grid', 'solar', 'wind']),
  recordedAt: z.string().datetime()
});

export const iotBatchSchema = z.object({
  readings: z.array(iotReadingSchema).min(1).max(500)
});

export const thresholdSchema = z.object({
  zoneId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  thresholdKwh: z.number().positive().max(999999)
}).refine(data => data.zoneId || data.buildingId || data.deviceId, {
  message: "At least one scope (zone, building, or device) is required"
});

export const readingsQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  energySource: z.enum(['grid', 'solar', 'wind', 'manual']).optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const reportSchema = z.object({
  zoneId: z.string().uuid().optional(),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  energySource: z.enum(['grid', 'solar', 'wind', 'manual']).optional(),
  buildingId: z.string().uuid().optional(),
  deviceCategory: z.string().optional()
});

export const controlRequestReviewSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional()
});

export const tariffSchema = z.object({
  rate: z.number().positive().max(999)
});

export const alertQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  status: z.enum(['new', 'acknowledged', 'resolved']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});
