type TrackProcessorCtor = new (init: { track: MediaStreamTrack }) => { readable: ReadableStream<AudioData> };

/** MediaStreamTrackProcessor is Chromium-only (Chrome/Edge); it is what turns a MediaStream into raw audio frames. */
export const getTrackProcessorCtor = (): TrackProcessorCtor | undefined =>
  (globalThis as unknown as { MediaStreamTrackProcessor?: TrackProcessorCtor }).MediaStreamTrackProcessor;

export const canListenLive = (): boolean =>
  typeof AudioDecoder !== "undefined" && typeof EncodedAudioChunk !== "undefined";

export const canBroadcastLive = (): boolean =>
  typeof AudioEncoder !== "undefined" && typeof AudioData !== "undefined" && getTrackProcessorCtor() !== undefined;

export const canShareTabAudio = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";
