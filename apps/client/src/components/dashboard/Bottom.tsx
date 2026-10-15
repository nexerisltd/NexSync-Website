import { extractFileNameFromUrl } from "@/lib/utils";
import { useGlobalStore } from "@/store/global";
import { Music2 } from "lucide-react";
import { motion } from "motion/react";
import { Player } from "../room/Player";
import { GlobalVolumeControl } from "./GlobalVolumeControl";
import { NudgeControl } from "./NudgeControl";

/** Stable gradient for a track: the same name always gets the same colours (there is no cover art in the queue data). */
const coverGradient = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = 200 + (hash % 80); // blues / violets, matches the brand
  return `linear-gradient(135deg, hsl(${hue} 85% 55%), hsl(${(hue + 40) % 360} 80% 32%))`;
};

const NowPlaying = () => {
  const selectedUrl = useGlobalStore((state) => state.selectedAudioUrl);
  const isPlaying = useGlobalStore((state) => state.isPlaying);
  const sources = useGlobalStore((state) => state.audioSources);

  if (!selectedUrl) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/6 text-neutral-400">
          <Music2 className="size-6" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">Nothing playing</div>
          <div className="truncate text-xs text-neutral-400">Add or pick a track</div>
        </div>
      </div>
    );
  }

  const title = extractFileNameFromUrl(selectedUrl);
  const index = sources.findIndex((s) => s.source.url === selectedUrl);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/15"
        style={{ background: coverGradient(title) }}
      >
        <Music2 className={isPlaying ? "size-6 animate-pulse" : "size-6"} />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-white" title={title}>
          {title}
        </div>
        <div className="truncate text-xs text-neutral-400">
          {index >= 0 ? `Track ${index + 1} of ${sources.length}` : "NexSync"}
          {" · "}
          {isPlaying ? "Playing in sync" : "Paused"}
        </div>
      </div>
    </div>
  );
};

export const Bottom = () => {
  return (
    <motion.div className="relative z-10 flex-shrink-0 glass-flat nx-panel p-3 pb-safe-plus-4 lg:mx-3 lg:mb-3 lg:p-3.5">
      <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4">
        {/* Left: now playing (desktop) */}
        <div className="hidden w-[22rem] shrink-0 lg:block">
          <NowPlaying />
        </div>

        {/* Center: transport + progress */}
        <div className="mx-auto min-w-0 max-w-3xl flex-1">
          <Player />
        </div>

        {/* Right: nudge + volume (desktop) */}
        <div className="hidden w-[22rem] shrink-0 items-center justify-end gap-5 lg:flex">
          <NudgeControl />
          <GlobalVolumeControl />
        </div>
      </div>
    </motion.div>
  );
};
