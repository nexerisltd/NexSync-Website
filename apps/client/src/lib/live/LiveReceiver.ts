import { decodeLiveFrame, epochNow, LIVE_CONSTANTS } from "@beatsync/shared";
import { audioContextManager } from "@/lib/audioContextManager";
import { getFilteredOutputLatencyMs, useGlobalStore } from "@/store/global";

// If a frame lands within this much of where the previous one ended, keep the audio gapless instead of re-snapping
const SEAMLESS_TOLERANCE_S = 0.03;

/**
 * Plays the admin's live audio. Each frame carries the server-time at which it was captured; it is played at
 * (captureServerTime + playoutDelay), converted to this device's audio clock with the same NTP offset, nudge and
 * output-latency compensation the queue player uses. Same offset maths on every device = listeners stay in sync.
 */
export class LiveReceiver {
  private decoder?: AudioDecoder;
  private playoutDelayMs: number = LIVE_CONSTANTS.DEFAULT_PLAYOUT_DELAY_MS;
  private nextStartTime = 0;
  private lastSeq = -1;
  private active = false;
  private sources = new Set<AudioBufferSourceNode>();

  /** Late frames dropped / frames played: handy for the UI and for tuning the delay presets. */
  stats = { played: 0, late: 0 };

  start(playoutDelayMs: number): void {
    this.stop();
    if (typeof AudioDecoder === "undefined") return;
    this.playoutDelayMs = playoutDelayMs;
    this.active = true;
    this.lastSeq = -1;
    this.nextStartTime = 0;
    this.stats = { played: 0, late: 0 };

    this.decoder = new AudioDecoder({
      output: (audio) => this.schedule(audio),
      error: (error) => console.error("[Live] decoder error", error),
    });
    this.decoder.configure({ codec: "opus", sampleRate: LIVE_CONSTANTS.SAMPLE_RATE, numberOfChannels: 2 });
    void audioContextManager.resume().catch(() => {});
  }

  stop(): void {
    this.active = false;
    if (this.decoder && this.decoder.state !== "closed") this.decoder.close();
    this.decoder = undefined;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already ended
      }
    }
    this.sources.clear();
  }

  push(data: ArrayBuffer): void {
    if (!this.active || !this.decoder || this.decoder.state !== "configured") return;
    const frame = decodeLiveFrame(data);
    if (!frame) return;
    // Reordered / duplicate frame: drop it (a big jump backwards means the broadcaster restarted)
    if (frame.seq <= this.lastSeq && this.lastSeq - frame.seq < 1000) return;
    this.lastSeq = frame.seq;

    // Opus' timestamp field (microseconds) carries the capture time through the decoder untouched
    this.decoder.decode(
      new EncodedAudioChunk({ type: "key", timestamp: Math.round(frame.captureServerTimeMs * 1000), data: frame.payload })
    );
  }

  private schedule(audio: AudioData): void {
    try {
      if (!this.active) return;
      const ctx = audioContextManager.getContext();
      const { offsetEstimate, nudgeOffsetMs } = useGlobalStore.getState();

      const targetServerMs = audio.timestamp / 1000 + this.playoutDelayMs;
      const waitMs = targetServerMs - (epochNow() + offsetEstimate + nudgeOffsetMs);
      const desiredStart = ctx.currentTime + (waitMs - getFilteredOutputLatencyMs()) / 1000;
      const duration = audio.numberOfFrames / audio.sampleRate;

      // Too late to be in sync: skip it (a gap beats being out of sync with everyone else)
      if (desiredStart + duration < ctx.currentTime) {
        this.stats.late += 1;
        return;
      }

      const startAt =
        this.nextStartTime > 0 && Math.abs(desiredStart - this.nextStartTime) < SEAMLESS_TOLERANCE_S
          ? this.nextStartTime
          : desiredStart;
      this.nextStartTime = startAt + duration;

      const buffer = ctx.createBuffer(audio.numberOfChannels, audio.numberOfFrames, audio.sampleRate);
      const channel = new Float32Array(audio.numberOfFrames);
      for (let i = 0; i < audio.numberOfChannels; i++) {
        audio.copyTo(channel, { planeIndex: i, format: "f32-planar" });
        buffer.copyToChannel(channel, i);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextManager.getInputNode()); // low-pass + master volume still apply
      source.onended = () => this.sources.delete(source);
      this.sources.add(source);
      source.start(Math.max(startAt, ctx.currentTime));
      this.stats.played += 1;
    } finally {
      audio.close();
    }
  }
}

export const liveReceiver = new LiveReceiver();
