import { z } from "zod";
import { checkWorkerAuth, MAX_TRACKS, ytRemote } from "@/lib/ytRemote";
import { errorResponse, jsonResponse } from "@/utils/responses";

// Endpoints used ONLY by the cloud (Kaggle) YouTube worker. Protected with YT_WORKER_SECRET.

const authError = (req: Request): Response | null => {
  const auth = checkWorkerAuth(req);
  if (auth === "not_configured") return errorResponse("Remote worker is not configured (YT_WORKER_SECRET missing)", 503);
  if (auth === "unauthorized") return errorResponse("Unauthorized", 401);
  return null;
};

/** GET /worker/next?wait=8 -> { job: {id, roomId, url, maxTracks} | null } (long-poll) */
export const handleWorkerNext = async (req: Request) => {
  const denied = authError(req);
  if (denied) return denied;
  if (req.method !== "GET") return errorResponse("Method not allowed", 405);

  const wait = Math.min(Math.max(Number(new URL(req.url).searchParams.get("wait") ?? 8), 0), 9) * 1000; // Bun idleTimeout is 10s
  const job = await ytRemote.claimNext(wait);
  return jsonResponse({ job: job ? { id: job.id, roomId: job.roomId, url: job.url, maxTracks: MAX_TRACKS() } : null });
};

const EventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("listed"),
    jobId: z.string(),
    total: z.number().int().min(0).max(500),
    truncated: z.boolean().optional(),
  }),
  z.object({ type: z.literal("track"), jobId: z.string(), index: z.number().int().min(0), publicUrl: z.url() }),
  z.object({
    type: z.literal("failed"),
    jobId: z.string(),
    index: z.number().int().min(0),
    reason: z.string().max(300).optional(),
  }),
  z.object({ type: z.literal("done"), jobId: z.string(), reason: z.string().max(300).optional() }),
]);

/** POST /worker/event  { jobId, type: listed|track|failed|done, ... } */
export const handleWorkerEvent = async (req: Request) => {
  const denied = authError(req);
  if (denied) return denied;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const parsed = EventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse(`Invalid event: ${parsed.error.message}`, 400);
  const { jobId, ...ev } = parsed.data;

  // Only accept audio URLs that live in our own bucket.
  const publicBase = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (ev.type === "track" && publicBase && !ev.publicUrl.startsWith(publicBase)) {
    return errorResponse("publicUrl is not in the configured bucket", 400);
  }

  const result = ytRemote.handleEvent(jobId, ev);
  return result.ok ? jsonResponse({ success: true }) : errorResponse(result.error ?? "Rejected", 404);
};
