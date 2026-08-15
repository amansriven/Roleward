export const platformCapabilities = [
  "database",
  "storage",
  "queues",
  "ai",
  "execution",
  "telemetry",
] as const;

export type PlatformCapability = (typeof platformCapabilities)[number];
