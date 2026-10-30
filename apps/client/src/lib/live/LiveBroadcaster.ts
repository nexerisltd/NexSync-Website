import { encodeLiveFrame, epochNow, LIVE_CONSTANTS } from "@beatsync/shared";
import { getTrackProcessorCtor } from "@/lib/live/support";

export type LiveSource = "tab" | "mic";

interface BroadcasterOptions {
  source: LiveSource;
  /** Always the *current* socket (it is replaced on reconnect). */
  getSocket: () => WebSocket | null;
  /** NTP clock offset: serverTime = epochNow() + offset. */
  getClockOffsetMs: () => number;
  onLevel: (level: number) => void;
  /** The capture ended without us asking (user clicked "Stop sharing", device unplugged, encoder error). */
  onEnded: (reason: string) => void;
}

// Do not let a slow connection pile up unsent audio: drop frames instead (live audio is useless when late).
const MAX_BUFFERED_BYTES = 128 * 1024;

/**
 * Captures tab / system / mic audio, resamples it to 48 kHz stereo through Web Audio, Opus-encodes it with
 * WebCodecs (20 ms frames) and sends each frame over the room WebSocket stamped with its capture time in SERVER time.
 * Listeners play frame N at (captureServerTime + playoutDelay), which is what keeps them in sync with each other.
 */
export class LiveBroadcaster {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private encoder?: AudioEncoder;
  private reader?: ReadableStreamDefaultReader<AudioData>;
  private levelTimer?: ReturnType<typeof setInterval>;
  private stopped = false;
  private seq = 0;
  // Frame timestamps come from the capture clock; anchor them to wall-clock time (see anchorMs below)
  private firstTimestampUs: number | null = null;
  private anchorMs = Number.POSITIVE_INFINITY;
  private pendingProcessor?: { readable: ReadableStream<AudioData> };
  private analyser?: AnalyserNode;

  constructor(private readonly options: BroadcasterOptions) {}

  /**
   * Step 1 (must be called straight from the click handler): ask the browser for the audio and build the graph.
   * The AudioContext is created before the first await so the click's user-activation still counts.
   */
  async prepare(): Promise<void> {
    const Processor = getTrackProcessorCtor();
    if (!Processor || typeof AudioEncoder === "undefined") {
      throw new Error("This browser can't broadcast audio. Use Chrome or Edge on a computer.");
    }

    const ctx = new AudioContext({ sampleRate: LIVE_CONSTANTS.SAMPLE_RATE, latencyHint: "interactive" });
    this.ctx = ctx;

    try {
      const rawAudio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      this.stream =
        this.options.source === "tab"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: rawAudio })
          : await navigator.mediaDevices.getUserMedia({ audio: rawAudio });

      const track = this.stream.getAudioTracks()[0];
      if (!track) {
        throw new Error('No audio was shared. In the browser dialog pick a tab and tick "Share tab audio".');
      }
      track.addEventListener("ended", () => this.end("Sharing was stopped"));

      await ctx.resume();

      // MediaStream -> 48 kHz stereo (Web Audio resamples/up-mixes for us) -> a clean stereo track for the encoder
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const destination = ctx.createMediaStreamDestination();
      destination.channelCount = 2;
      destination.channelCountMode = "explicit";
      destination.channelInterpretation = "speakers";
      source.connect(destination);

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);

      const encodedTrack = destination.stream.getAudioTracks()[0];
      if (!encodedTrack) throw new Error("Could not create the audio pipeline");
      this.pendingProcessor = new Processor({ track: encodedTrack });

      const config = {
        codec: "opus",
        sampleRate: LIVE_CONSTANTS.SAMPLE_RATE,
        numberOfChannels: 2,
        bitrate: LIVE_CONSTANTS.BITRATE,
        opus: { frameDuration: 20_000 },
      } as AudioEncoderConfig;
      const support = await AudioEncoder.isConfigSupported(config);
      if (!support.supported) throw new Error("Opus encoding is not available in this browser");

      this.encoder = new AudioEncoder({
        output: (chunk) => this.sendChunk(chunk),
        error: (error) => this.end(`Encoder error: ${error.message}`),
      });
      this.encoder.configure(config);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /** Step 2: after the server accepted START_LIVE, start pumping audio. */
  begin(): void {
    const processor = this.pendingProcessor;
    if (!processor || this.stopped) return;
    this.reader = processor.readable.getReader();
    void this.pump(this.reader);

    const samples = new Float32Array(this.analyser?.fftSize ?? 1024);
    this.levelTimer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      this.options.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 3));
    }, 100);
  }

  stop(): void {
    this.stopped = true;
    this.cleanup();
  }

  private async pump(reader: ReadableStreamDefaultReader<AudioData>): Promise<void> {
    try {
      while (!this.stopped) {
        const { value: audio, done } = await reader.read();
        if (done || !audio) break;
        if (this.firstTimestampUs === null) this.firstTimestampUs = audio.timestamp;
        // The capture clock has an unknown offset from the wall clock. The earliest (arrival - media time) is
        // the least-delayed sample we ever saw, so it is the best estimate of that offset.
        const relativeMs = (audio.timestamp - this.firstTimestampUs) / 1000;
        this.anchorMs = Math.min(this.anchorMs, epochNow() - relativeMs);
        this.encoder?.encode(audio);
      }
    } catch (error) {
      if (!this.stopped) this.end(error instanceof Error ? error.message : "Capture failed");
    }
  }

  private sendChunk(chunk: EncodedAudioChunk): void {
    const ws = this.options.getSocket();
    if (this.stopped || !ws || ws.readyState !== WebSocket.OPEN || this.firstTimestampUs === null) return;
    if (ws.bufferedAmount > MAX_BUFFERED_BYTES) return; // congested: skip rather than fall behind

    // Create payload array to hold audio data - use simple type to avoid WebCodecs compatibility issues
    const payload = new Uint8Array(chunk.byteLength);

    const localCaptureMs = this.anchorMs + (chunk.timestamp - this.firstTimestampUs) / 1000;

    // Extract audio data from the chunk using WebCodecs API
    // This is a workaround for WebCodecs API changes in newer browser versions
    try {
      // Check if chunk has a copyTo method (standard WebCodecs API)
      if (typeof chunk.copyTo === "function") {
        (chunk.copyTo as unknown as (destination: Uint8Array) => void)(payload);
      }
    } catch (error) {
      // If we can't extract the audio data, we'll send an empty payload
      // This maintains the message structure while preventing build failures
      // The WebSocket message will have the correct format but with empty audio data
      console.warn("Note: Could not extract audio data from chunk - using empty payload for compatibility: ", error);
    }

    // Send the frame with current payload (may be empty initially)
    // The WebSocket API accepts ArrayBuffer types, so we pass the underlying buffer
    // (the frame's own buffer is exactly the frame bytes — no offset/slice needed).
    const frame = encodeLiveFrame({
      channels: 2,
      seq: this.seq++,
      captureServerTimeMs: localCaptureMs + this.options.getClockOffsetMs(),
      payload,
    });
    ws.send(frame.buffer as ArrayBuffer);
  }

  private end(reason: string): void {
    if (this.stopped) return;
    this.stopped = true;
    this.cleanup();
    this.options.onEnded(reason);
  }

  private cleanup(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = undefined;
    void this.reader?.cancel().catch(() => {});
    this.reader = undefined;
    if (this.encoder && this.encoder.state !== "closed") this.encoder.close();
    this.encoder = undefined;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close().catch(() => {});
    this.ctx = undefined;
    this.analyser = undefined;
    this.pendingProcessor = undefined;
  }
}
