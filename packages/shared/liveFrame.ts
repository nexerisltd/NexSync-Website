import { LIVE_CONSTANTS } from "./constants";

export interface LiveFrame {
  channels: number;
  seq: number;
  /** Capture moment in SERVER time (ms). Listeners play it at captureServerTimeMs + playoutDelayMs. */
  captureServerTimeMs: number;
  payload: Uint8Array;
}

export const encodeLiveFrame = (frame: LiveFrame): Uint8Array => {
  const out = new Uint8Array(LIVE_CONSTANTS.HEADER_BYTES + frame.payload.byteLength);
  const view = new DataView(out.buffer as ArrayBuffer);
  view.setUint8(0, LIVE_CONSTANTS.FRAME_TYPE_AUDIO);
  view.setUint8(1, frame.channels);
  view.setUint32(2, frame.seq >>> 0);
  view.setFloat64(6, frame.captureServerTimeMs);
  out.set(frame.payload, LIVE_CONSTANTS.HEADER_BYTES);
  return out;
};

/** Returns null for anything that is not a well-formed audio frame. */
export const decodeLiveFrame = (data: ArrayBuffer | Uint8Array): LiveFrame | null => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength <= LIVE_CONSTANTS.HEADER_BYTES || bytes.byteLength > LIVE_CONSTANTS.MAX_FRAME_BYTES) return null;
  const view = new DataView(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== LIVE_CONSTANTS.FRAME_TYPE_AUDIO) return null;
  const channels = view.getUint8(1);
  if (channels < 1 || channels > 2) return null;
  const captureServerTimeMs = view.getFloat64(6);
  if (!Number.isFinite(captureServerTimeMs)) return null;
  return {
    channels,
    seq: view.getUint32(2),
    captureServerTimeMs,
    payload: bytes.subarray(LIVE_CONSTANTS.HEADER_BYTES),
  };
};
