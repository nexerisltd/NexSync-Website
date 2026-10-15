"use client";

import { audioContextManager } from "@/lib/audioContextManager";
import { cn } from "@/lib/utils";
import { MAX_NTP_MEASUREMENTS, useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { Check, Hash, Link2, Music2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AudioUploaderMinimal } from "../AudioUploaderMinimal";
import { Separator } from "../ui/separator";
import { DevCollabDialog } from "../DevCollab";
import { YoutubePlaylistImport } from "../YoutubePlaylistImport";
import { ConnectedUsersList } from "./ConnectedUsersList";
import { RoomQRCode } from "./CopyRoom";
import { GlobalVolumeControl } from "./GlobalVolumeControl";
import { MobileNudgeControl } from "./MobileNudgeControl";
import { PlaybackPermissions } from "./PlaybackPermissions";

interface LeftProps {
  className?: string;
}

/** One-tap "copy the room link" (the admin flag is stripped, same as the QR dialog). */
const CopyRoomLink = () => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("admin");
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Insecure context: clipboard API unavailable. The QR dialog shows the link as selectable text instead.
    }
  };

  return (
    <button type="button" onClick={() => void copy()} className="nx-icon-btn size-8" aria-label="Copy room link" title="Copy room link">
      {copied ? <Check className="size-4 text-green-400" /> : <Link2 className="size-4" />}
    </button>
  );
};

export const Left = ({ className }: LeftProps) => {
  const roomId = useRoomStore((state) => state.roomId);
  const clockOffset = useGlobalStore((state) => state.offsetEstimate);
  const roundTripEstimate = useGlobalStore((state) => state.roundTripEstimate);
  const syncMeasurementCount = useGlobalStore((state) => state.syncMeasurements.length);

  return (
    <motion.div
      className={cn(
        "w-full lg:w-80 xl:w-[21rem] lg:flex-shrink-0 glass-flat nx-panel flex flex-col pb-4 lg:pb-3 text-sm space-y-1 overflow-y-auto flex-shrink-0 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20",
        className
      )}
    >
      {/* Room header */}
      <motion.div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
            <Hash size={18} className="shrink-0 text-primary-400" />
            <span className="truncate">Room {roomId}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CopyRoomLink />
            {/* QR Code Dialog */}
            <RoomQRCode />
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-3 px-4 py-1 text-[10px] font-mono text-neutral-400 lg:hidden">
        <span>Offset: {clockOffset.toFixed(1)}ms</span>
        <span>RTT: {roundTripEstimate.toFixed(1)}ms</span>
        <span>OL: {((audioContextManager.getContext().outputLatency ?? 0) * 1000).toFixed(0)}ms</span>
        <span>
          NTP: {syncMeasurementCount}/{MAX_NTP_MEASUREMENTS}
        </span>
      </div>

      <Separator className="bg-white/6" />

      <PlaybackPermissions />

      <Separator className="bg-white/6" />

      <div className="block lg:hidden">
        <GlobalVolumeControl isMobile />
        <Separator className="bg-white/6" />
        <MobileNudgeControl />
        <Separator className="bg-white/6" />
      </div>

      {/* Connected Users List */}
      <ConnectedUsersList />

      {/* Add music */}
      <motion.div className="mt-auto pt-2 text-neutral-400">
        <p className="nx-section px-4 pb-2">
          <Music2 className="size-3.5" />
          Add music
        </p>
        <AudioUploaderMinimal />
        <YoutubePlaylistImport />

        <p className="px-4 pt-3 text-[11px] leading-relaxed text-neutral-400">
          Tip: play on the device speaker directly. Bluetooth adds delay.
        </p>

        <div className="pb-1 pt-1">
          <DevCollabDialog />
        </div>
      </motion.div>
    </motion.div>
  );
};
