"use client";

import { audioContextManager } from "@/lib/audioContextManager";
import { cn } from "@/lib/utils";
import { MAX_NTP_MEASUREMENTS, useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { Hash } from "lucide-react";
import { motion } from "motion/react";
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

export const Left = ({ className }: LeftProps) => {
  const roomId = useRoomStore((state) => state.roomId);
  const clockOffset = useGlobalStore((state) => state.offsetEstimate);
  const roundTripEstimate = useGlobalStore((state) => state.roundTripEstimate);
  const syncMeasurementCount = useGlobalStore((state) => state.syncMeasurements.length);

  return (
    <motion.div
      className={cn(
        "w-full lg:w-80 lg:flex-shrink-0 glass-flat flex flex-col pb-4 lg:pb-0 text-sm space-y-1 overflow-y-auto flex-shrink-0 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20",
        className
      )}
    >
      {/* Header section */}
      {/* <div className="px-3 py-2 flex items-center gap-2">
        <div className="bg-white/8 rounded-md p-1.5">
          <Music className="h-4 w-4 text-white" />
        </div>
        <h1 className="font-semibold text-white">Beatsync</h1>
      </div>


      <Separator className="bg-white/6" /> */}

      {/* Navigation menu */}
      <motion.div className="px-3.5 space-y-2.5 py-2 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Hash size={18} />
            <span>Room {roomId}</span>
          </div>

          {/* QR Code Dialog */}
          <RoomQRCode />
        </div>
      </motion.div>

      <Separator className="bg-white/6" />

      <div className="flex items-center gap-3 px-3.5 py-2 text-[10px] font-mono text-neutral-400 lg:hidden">
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

      {/* Playback Permissions */}

      {/* <Separator className="bg-white/6" /> */}

      {/* Add music */}
      <motion.div className="mt-auto pt-2 text-neutral-400">
        <p className="nx-label px-4 pb-1">Add music</p>
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
