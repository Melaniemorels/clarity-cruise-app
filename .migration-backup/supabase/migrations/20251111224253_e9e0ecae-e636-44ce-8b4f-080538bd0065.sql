-- Add more device providers to the enum
ALTER TYPE device_provider ADD VALUE IF NOT EXISTS 'OURA';
ALTER TYPE device_provider ADD VALUE IF NOT EXISTS 'WHOOP';
ALTER TYPE device_provider ADD VALUE IF NOT EXISTS 'APPLE_WATCH';