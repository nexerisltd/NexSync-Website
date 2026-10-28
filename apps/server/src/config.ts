// Audio settings
export const AUDIO_LOW = 0.15;
export const AUDIO_HIGH = 1.0;
export const VOLUME_UP_RAMP_TIME = 0.5;
export const VOLUME_DOWN_RAMP_TIME = 0.5;

// Scheduling settings
export const MIN_SCHEDULE_TIME_MS = 400; // Minimum scheduling delay
export const DEFAULT_CLIENT_RTT_MS = 0; // Default RTT when no clients or initial value
const CAP_SCHEDULE_TIME_MS = 3_000; // Maximum scheduling delay

/**
 * Calculate dynamic scheduling delay based on maximum client RTT
 * @param maxRTT Maximum RTT among all clients in milliseconds
 * @returns Scheduling delay in milliseconds
 */
export function calculateScheduleTimeMs(maxRTT: number): number {
  // Use 1.5x the max RTT with a minimum of 400ms
  // The 1.5x factor provides buffer for jitter and processing time
  const dynamicDelay = Math.max(MIN_SCHEDULE_TIME_MS, maxRTT * 1.5 + 200);

  // Cap at 3000ms to prevent excessive delays
  return Math.min(dynamicDelay, CAP_SCHEDULE_TIME_MS);
}

// ---------------------------------------------------------------------------
// Capacity limits. Defaults are generous (a 1 vCPU / 1 GB machine comfortably holds a couple of thousand
// listeners spread over many rooms); lower them on small hosts, e.g. MAX_TOTAL_CLIENTS=200 on a free instance.
// ---------------------------------------------------------------------------
const intFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

export const LIMITS = {
  /** New connections are refused (HTTP 503) once the whole server holds this many sockets. */
  MAX_TOTAL_CLIENTS: intFromEnv("MAX_TOTAL_CLIENTS", 5000),
  /** New connections to one room are refused once it holds this many sockets. */
  MAX_CLIENTS_PER_ROOM: intFromEnv("MAX_CLIENTS_PER_ROOM", 3000),
  /** Above this many people a room is "large": client lists are shortened and broadcasts slowed down (O(n²) otherwise). */
  LARGE_ROOM_THRESHOLD: intFromEnv("LARGE_ROOM_THRESHOLD", 100),
  /** How many people a large room's CLIENT_CHANGE lists (admins first, then earliest joiners). */
  LARGE_ROOM_LIST_SIZE: intFromEnv("LARGE_ROOM_LIST_SIZE", 50),
  /** Spatial audio re-broadcasts everyone's gain 10x a second, so it only runs in rooms up to this size. */
  MAX_SPATIAL_CLIENTS: intFromEnv("MAX_SPATIAL_CLIENTS", 100),
  /** Largest websocket message accepted from a client (Bun's default is 16 MB). */
  MAX_WS_PAYLOAD_BYTES: intFromEnv("MAX_WS_PAYLOAD_BYTES", 256 * 1024),
  /** How many rooms may run a live audio broadcast at once (each one costs listeners x 8 KB/s of bandwidth). */
  MAX_LIVE_ROOMS: intFromEnv("MAX_LIVE_ROOMS", 5),
  /** Live broadcasts are refused in rooms with more people than this (WebSocket relay is for small rooms). */
  LIVE_MAX_LISTENERS_PER_ROOM: intFromEnv("LIVE_MAX_LISTENERS_PER_ROOM", 50),
} as const;

/** Delay before a CLIENT_CHANGE broadcast goes out: short for normal rooms, longer as a room grows. */
export function clientChangeDelayMs(roomSize: number): number {
  if (roomSize <= LIMITS.LARGE_ROOM_THRESHOLD) return 500;
  return Math.min(5000, 500 + roomSize * 2);
}
