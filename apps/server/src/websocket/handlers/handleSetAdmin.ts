import type { ExtractWSRequestFrom } from "@beatsync/shared";
import { sendBroadcast } from "@/utils/responses";
import { requireRoomAdmin } from "@/websocket/middlewares";
import type { HandlerFunction } from "@/websocket/types";

export const handleSetAdmin: HandlerFunction<ExtractWSRequestFrom["SET_ADMIN"]> = ({ ws, message, server }) => {
  const { room } = requireRoomAdmin(ws);
  room.setAdmin({
    targetClientId: message.clientId,
    isAdmin: message.isAdmin,
  });

  // Only admins may broadcast
  if (!message.isAdmin && room.isLiveBroadcaster(message.clientId)) {
    room.stopLive(server);
  }

  sendBroadcast({
    server,
    roomId: ws.data.roomId,
    message: {
      type: "ROOM_EVENT",
      event: {
        type: "CLIENT_CHANGE",
        clients: room.getClients(),
      },
    },
  });
};
