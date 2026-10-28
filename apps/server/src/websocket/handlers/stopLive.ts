import type { ExtractWSRequestFrom } from "@beatsync/shared/types/WSRequest";
import { requireRoomAdmin } from "@/websocket/middlewares";
import type { HandlerFunction } from "@/websocket/types";

export const handleStopLive: HandlerFunction<ExtractWSRequestFrom["STOP_LIVE"]> = ({ ws, server }) => {
  // Any admin may stop a broadcast (e.g. the broadcaster's tab froze)
  const { room } = requireRoomAdmin(ws);
  room.stopLive(server);
};
