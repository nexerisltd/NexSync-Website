import type { ExtractWSRequestFrom } from "@beatsync/shared/types/WSRequest";
import { globalManager } from "@/managers";
import { sendToClient } from "@/utils/responses";
import { requireRoomAdmin } from "@/websocket/middlewares";
import type { HandlerFunction } from "@/websocket/types";

export const handleStartLive: HandlerFunction<ExtractWSRequestFrom["START_LIVE"]> = ({ ws, message, server }) => {
  const { room } = requireRoomAdmin(ws);
  const error = room.startLive({
    clientId: ws.data.clientId,
    playoutDelayMs: message.playoutDelayMs,
    server,
    liveRoomCount: globalManager.getLiveRoomCount(),
  });
  if (error) {
    sendToClient({
      ws,
      message: { type: "ROOM_EVENT", event: { type: "LIVE_STATE", active: false, error } },
    });
  }
};
