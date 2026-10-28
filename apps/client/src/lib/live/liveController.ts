import { ClientActionEnum, LIVE_CONSTANTS, type LiveStateType } from "@beatsync/shared";
import { toast } from "sonner";
import { getClientId } from "@/lib/clientId";
import { LiveBroadcaster, type LiveSource } from "@/lib/live/LiveBroadcaster";
import { liveReceiver } from "@/lib/live/LiveReceiver";
import { canListenLive } from "@/lib/live/support";
import { useGlobalStore } from "@/store/global";
import { useLiveStore } from "@/store/live";
import { sendWSRequest } from "@/utils/ws";

let broadcaster: LiveBroadcaster | null = null;

const sendToServer = (request: Parameters<typeof sendWSRequest>[0]["request"]) => {
  const ws = useGlobalStore.getState().socket;
  if (ws && ws.readyState === WebSocket.OPEN) sendWSRequest({ ws, request });
};

const teardownBroadcaster = () => {
  broadcaster?.stop();
  broadcaster = null;
  useLiveStore.getState().setBroadcasting(false);
  useLiveStore.getState().setStarting(false);
};

/** Admin pressed "Go live". Call this directly from the click handler (the browser needs the user gesture). */
export const startLiveBroadcast = async (source: LiveSource, playoutDelayMs: number): Promise<void> => {
  const live = useLiveStore.getState();
  if (broadcaster || live.isStarting) return;
  live.setStarting(true);

  const next = new LiveBroadcaster({
    source,
    getSocket: () => useGlobalStore.getState().socket,
    getClockOffsetMs: () => useGlobalStore.getState().offsetEstimate,
    onLevel: (level) => useLiveStore.getState().setLevel(level),
    onEnded: (reason) => {
      toast.info(`Live broadcast ended: ${reason}`);
      sendToServer({ type: ClientActionEnum.enum.STOP_LIVE });
      teardownBroadcaster();
    },
  });
  broadcaster = next;

  try {
    await next.prepare();
    // Text messages and binary frames share one socket and arrive in order, so START_LIVE is processed first
    sendToServer({ type: ClientActionEnum.enum.START_LIVE, playoutDelayMs });
    next.begin();
    useLiveStore.getState().setBroadcasting(true);
  } catch (error) {
    teardownBroadcaster();
    const message = error instanceof Error ? error.message : "Could not start the broadcast";
    // Cancelling the browser's share dialog is not an error worth shouting about
    if (!(error instanceof DOMException && error.name === "NotAllowedError")) toast.error(message);
  } finally {
    useLiveStore.getState().setStarting(false);
  }
};

export const stopLiveBroadcast = (): void => {
  sendToServer({ type: ClientActionEnum.enum.STOP_LIVE });
  teardownBroadcaster();
};

/** Server told us the room's live state changed (also sent to every client when it joins). */
export const applyLiveState = (event: LiveStateType): void => {
  const store = useLiveStore.getState();

  if (event.error) {
    toast.error(event.error);
    teardownBroadcaster();
    return;
  }

  if (!event.active) {
    liveReceiver.stop();
    store.setInfo(null);
    if (broadcaster) teardownBroadcaster();
    return;
  }

  const playoutDelayMs = event.playoutDelayMs ?? LIVE_CONSTANTS.DEFAULT_PLAYOUT_DELAY_MS;
  store.setInfo({ broadcasterId: event.broadcasterId, broadcasterName: event.broadcasterName, playoutDelayMs });

  if (event.broadcasterId === getClientId()) {
    // The server thinks this device is broadcasting but we have no capture (e.g. page was reloaded): reset it
    if (!broadcaster) sendToServer({ type: ClientActionEnum.enum.STOP_LIVE });
    return;
  }

  if (!canListenLive()) {
    toast.error("Your browser can't play live audio. Use a recent Chrome, Edge or Firefox.");
    return;
  }
  liveReceiver.start(playoutDelayMs);
};
