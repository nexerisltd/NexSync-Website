// Capacity behaviour for big rooms: short client lists, slower CLIENT_CHANGE broadcasts, spatial-audio cap.

import { afterEach, describe, expect, it } from "bun:test";
import sinon from "sinon";
import { createMockServer, createMockWs } from "@/__tests__/mocks/websocket";
import { clientChangeDelayMs, LIMITS } from "@/config";
import { globalManager } from "@/managers/GlobalManager";

const createdRooms: string[] = [];

function makeRoom(roomId: string, size: number) {
  const room = globalManager.getOrCreateRoom(roomId);
  createdRooms.push(roomId);
  for (let i = 0; i < size; i++) {
    room.addClient(createMockWs({ clientId: `client-${i}`, roomId }));
  }
  return room;
}

afterEach(() => {
  for (const roomId of createdRooms.splice(0)) {
    globalManager.getRoom(roomId)?.stopSpatialAudio();
    globalManager.deleteRoom(roomId);
  }
});

describe("client list in CLIENT_CHANGE", () => {
  it("lists everybody in a normal room", () => {
    const room = makeRoom("normal-room", 20);
    const { clients, total } = room.getClientListForBroadcast();
    expect(clients).toHaveLength(20);
    expect(total).toBe(20);
  });

  it("shortens the list in a large room, admins first, always keeping the total", () => {
    const room = makeRoom("big-room", LIMITS.LARGE_ROOM_THRESHOLD + 60);
    const { clients, total } = room.getClientListForBroadcast();

    expect(total).toBe(LIMITS.LARGE_ROOM_THRESHOLD + 60);
    expect(clients).toHaveLength(LIMITS.LARGE_ROOM_LIST_SIZE);

    const firstNonAdmin = clients.findIndex((c) => !c.isAdmin);
    const lastAdmin = clients.map((c) => c.isAdmin).lastIndexOf(true);
    if (firstNonAdmin !== -1 && lastAdmin !== -1) expect(lastAdmin).toBeLessThan(firstNonAdmin);
  });

  it("always includes the person it is sent to, even when they joined late", () => {
    const room = makeRoom("big-room-self", LIMITS.LARGE_ROOM_THRESHOLD + 60);
    const lastJoiner = `client-${LIMITS.LARGE_ROOM_THRESHOLD + 59}`;

    expect(room.getClientListForBroadcast().clients.some((c) => c.clientId === lastJoiner)).toBe(false);
    expect(room.getClientListForBroadcast(lastJoiner).clients.some((c) => c.clientId === lastJoiner)).toBe(true);
  });
});

describe("CLIENT_CHANGE broadcast timing", () => {
  it("waits longer as a room grows, up to 5 seconds", () => {
    expect(clientChangeDelayMs(5)).toBe(500);
    expect(clientChangeDelayMs(LIMITS.LARGE_ROOM_THRESHOLD)).toBe(500);
    expect(clientChangeDelayMs(1000)).toBeGreaterThan(500);
    expect(clientChangeDelayMs(100_000)).toBe(5000);
  });

  it("turns a burst of joins into one broadcast that uses the latest callback", () => {
    const clock = sinon.useFakeTimers();
    try {
      const room = makeRoom("burst-room", 3);
      const calls: string[] = [];

      room.scheduleClientChangeBroadcast(() => calls.push("first"));
      clock.tick(100);
      room.scheduleClientChangeBroadcast(() => calls.push("second"));
      clock.tick(100);
      room.scheduleClientChangeBroadcast(() => calls.push("third"));

      clock.tick(clientChangeDelayMs(3));
      expect(calls).toEqual(["third"]);

      // and the next burst gets its own broadcast
      room.scheduleClientChangeBroadcast(() => calls.push("next"));
      clock.tick(clientChangeDelayMs(3));
      expect(calls).toEqual(["third", "next"]);
    } finally {
      clock.restore();
    }
  });

  it("can be cancelled", () => {
    const clock = sinon.useFakeTimers();
    try {
      const room = makeRoom("cancel-room", 2);
      let called = false;
      room.scheduleClientChangeBroadcast(() => {
        called = true;
      });
      room.clearClientChangeBroadcast();
      clock.tick(10_000);
      expect(called).toBe(false);
    } finally {
      clock.restore();
    }
  });
});

describe("spatial audio cap", () => {
  it("starts in a normal room and refuses in a huge one", () => {
    const server = createMockServer();

    const small = makeRoom("spatial-small", 5);
    expect(small.startSpatialAudio(server)).toBe(true);
    small.stopSpatialAudio();

    const huge = makeRoom("spatial-huge", LIMITS.MAX_SPATIAL_CLIENTS + 1);
    expect(huge.startSpatialAudio(server)).toBe(false);
  });
});

describe("connection counting", () => {
  it("counts open sockets across all rooms", () => {
    const before = globalManager.getTotalConnections();
    makeRoom("count-a", 4);
    makeRoom("count-b", 6);
    expect(globalManager.getTotalConnections() - before).toBe(10);
  });
});
