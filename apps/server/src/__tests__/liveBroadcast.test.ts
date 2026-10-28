// Live broadcast: only the active broadcaster's well-formed frames are relayed, one broadcast per room,
// queue playback is paused while live, and server limits hold.

import { afterEach, describe, expect, it, mock } from "bun:test";
import { encodeLiveFrame, epochNow, LIVE_CONSTANTS } from "@beatsync/shared";
import type { ServerWebSocket } from "bun";
import { createMockServer, createMockWs } from "@/__tests__/mocks/websocket";
import { LIMITS } from "@/config";
import { globalManager } from "@/managers/GlobalManager";
import { handleMessage } from "@/routes/websocketHandlers";
import type { WSData } from "@/utils/websocket";

const createdRooms: string[] = [];

function makeRoom(roomId: string) {
  createdRooms.push(roomId);
  return globalManager.getOrCreateRoom(roomId);
}

function joinWithPublish(roomId: string, clientId: string) {
  const ws = createMockWs({ clientId, roomId }) as ServerWebSocket<WSData> & { publish: ReturnType<typeof mock> };
  ws.publish = mock(() => 0);
  globalManager.getOrCreateRoom(roomId).addClient(ws);
  return ws;
}

const frame = (seq = 1, payloadBytes = 160) =>
  Buffer.from(
    encodeLiveFrame({ channels: 2, seq, captureServerTimeMs: epochNow(), payload: new Uint8Array(payloadBytes).fill(7) })
  );

afterEach(() => {
  for (const roomId of createdRooms.splice(0)) {
    globalManager.getRoom(roomId)?.stopSpatialAudio();
    globalManager.deleteRoom(roomId);
  }
});

describe("starting and stopping", () => {
  it("allows one broadcast per room and announces state changes", () => {
    const room = makeRoom("live-one");
    const server = createMockServer();
    room.addClient(createMockWs({ clientId: "dj", roomId: "live-one" }));

    expect(room.startLive({ clientId: "dj", playoutDelayMs: 1200, server, liveRoomCount: 0 })).toBeNull();
    expect(room.isLiveBroadcaster("dj")).toBe(true);
    expect(room.startLive({ clientId: "dj", playoutDelayMs: 1200, server, liveRoomCount: 1 })).toContain("already");

    room.stopLive(server);
    expect(room.getLiveState()).toBeUndefined();
    const published = (server.publish as ReturnType<typeof mock>).mock.calls.map((call) => String(call[1]));
    expect(published.filter((m) => m.includes('"LIVE_STATE"'))).toHaveLength(2); // start + stop
  });

  it("refuses when the server is at its live-room limit", () => {
    const room = makeRoom("live-limit");
    room.addClient(createMockWs({ clientId: "dj", roomId: "live-limit" }));
    const error = room.startLive({
      clientId: "dj",
      playoutDelayMs: 1200,
      server: createMockServer(),
      liveRoomCount: LIMITS.MAX_LIVE_ROOMS,
    });
    expect(error).not.toBeNull();
    expect(room.getLiveState()).toBeUndefined();
  });

  it("pauses file playback (keeping the position) when going live", () => {
    const room = makeRoom("live-pause");
    room.addClient(createMockWs({ clientId: "dj", roomId: "live-pause" }));
    room.restorePlaybackState({
      type: "playing",
      audioSource: "track-a",
      trackPositionSeconds: 5,
      serverTimeToExecute: epochNow() - 2000,
    });

    room.startLive({ clientId: "dj", playoutDelayMs: 1200, server: createMockServer(), liveRoomCount: 0 });

    const state = room.getPlaybackState();
    expect(state.type).toBe("paused");
    expect(state.trackPositionSeconds).toBeGreaterThan(6.9);
    expect(state.trackPositionSeconds).toBeLessThan(7.5);
  });
});

describe("frame relay", () => {
  it("relays frames from the broadcaster only, untouched", async () => {
    const room = makeRoom("live-relay");
    const dj = joinWithPublish("live-relay", "dj");
    const listener = joinWithPublish("live-relay", "listener");
    const server = createMockServer();
    room.startLive({ clientId: "dj", playoutDelayMs: 1200, server, liveRoomCount: 0 });

    const good = frame();
    await handleMessage(dj, good, server);
    await handleMessage(listener, frame(2), server); // not the broadcaster

    expect(dj.publish).toHaveBeenCalledTimes(1);
    expect((dj.publish as ReturnType<typeof mock>).mock.calls[0]?.[1]).toBe(good);
    expect(listener.publish).not.toHaveBeenCalled();
  });

  it("drops malformed and oversized frames", async () => {
    const room = makeRoom("live-bad");
    const dj = joinWithPublish("live-bad", "dj");
    const server = createMockServer();
    room.startLive({ clientId: "dj", playoutDelayMs: 1200, server, liveRoomCount: 0 });

    await handleMessage(dj, Buffer.from([1, 2, 3]), server);
    await handleMessage(dj, frame(1, LIVE_CONSTANTS.MAX_FRAME_BYTES), server);
    expect(dj.publish).not.toHaveBeenCalled();
  });

  it("relays nothing when nobody is live", async () => {
    makeRoom("live-off");
    const dj = joinWithPublish("live-off", "dj");
    await handleMessage(dj, frame(), createMockServer());
    expect(dj.publish).not.toHaveBeenCalled();
  });

  it("caps the broadcaster's frame rate", () => {
    const room = makeRoom("live-rate");
    room.addClient(createMockWs({ clientId: "dj", roomId: "live-rate" }));
    room.startLive({ clientId: "dj", playoutDelayMs: 1200, server: createMockServer(), liveRoomCount: 0 });

    let allowed = 0;
    for (let i = 0; i < LIVE_CONSTANTS.MAX_FRAMES_PER_SECOND + 50; i++) if (room.allowLiveFrame()) allowed++;
    expect(allowed).toBe(LIVE_CONSTANTS.MAX_FRAMES_PER_SECOND);
  });
});
