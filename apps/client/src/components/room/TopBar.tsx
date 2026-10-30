"use client";
import { SOCIAL_LINKS } from "@/constants";
import { audioContextManager } from "@/lib/audioContextManager";
import { MAX_NTP_MEASUREMENTS, useGlobalStore } from "@/store/global";
import { useRoomTotals } from "@/store/roomTotals";
import { ChevronDown, Crown, Link2, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { InstallAppButton } from "../InstallAppButton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SyncProgress } from "../ui/SyncProgress";

interface TopBarProps {
  roomId: string;
}

const initialsOf = (name: string) =>
  name
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const TopBar = ({ roomId }: TopBarProps) => {
  const isLoadingAudio = useGlobalStore((state) => state.isInitingSystem);
  const isSynced = useGlobalStore((state) => state.isSynced);
  const roundTripEstimate = useGlobalStore((state) => state.roundTripEstimate);
  const listedClientCount = useGlobalStore((state) => state.connectedClients.length);
  const totalClients = useRoomTotals((state) => state.total);
  const connectedClientCount = Math.max(totalClients, listedClientCount);
  const clockOffset = useGlobalStore((state) => state.offsetEstimate);
  const syncMeasurementCount = useGlobalStore((state) => state.syncMeasurements.length);

  const currentUser = useGlobalStore((state) => state.currentUser);
  const isAdmin = currentUser?.isAdmin || false;

  const copyRoomLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("admin");
      await navigator.clipboard.writeText(url.toString());
      toast.success("Room link copied");
    } catch {
      toast.error("Couldn't copy the link — use the QR button in the sidebar");
    }
  };

  // Full bar when synced and not loading
  if (!isLoadingAudio && isSynced) {
    return (
      <div className="z-50 flex h-14 items-center justify-between gap-3 px-3 glass-flat nx-panel lg:mx-3 lg:mt-3 lg:h-[3.75rem] lg:px-5">
        {/* Left: brand, room, live status */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-white transition-opacity hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-7 lg:size-8" />
            <span className="hidden text-base font-semibold tracking-tight sm:inline">NexSync</span>
          </Link>

          <span className="h-4 w-px bg-white/12" aria-hidden="true" />

          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500/40" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span className="font-medium text-white">Room {roomId}</span>
            <span className="text-neutral-400">
              · {connectedClientCount} {connectedClientCount === 1 ? "person" : "people"} listening
            </span>
            {isAdmin && (
              <span className="hidden items-center gap-1 text-neutral-400 md:flex">
                · <Crown className="size-3 text-yellow-400" fill="currentColor" /> Admin
              </span>
            )}
          </div>
        </div>

        {/* Right: quiet sync stats, then actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="mr-2 hidden items-center gap-4 rounded-xl border border-white/9 bg-white/5 px-3.5 py-2 font-mono text-[11px] text-neutral-500 lg:flex">
            <span>
              NTP{" "}
              <span className="text-neutral-300">
                {syncMeasurementCount}/{MAX_NTP_MEASUREMENTS}
              </span>
            </span>
            <span>
              Offset <span className="text-neutral-300">{clockOffset.toFixed(1)}ms</span>
            </span>
            <span>
              RTT <span className="text-neutral-300">{roundTripEstimate.toFixed(1)}ms</span>
            </span>
            <span>
              OL{" "}
              <span className="text-neutral-300">
                {((audioContextManager.getContext().outputLatency ?? 0) * 1000).toFixed(0)}ms
              </span>
            </span>
          </div>

          <InstallAppButton />
          {SOCIAL_LINKS.discord && (
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="nx-icon-btn hidden sm:inline-grid"
              aria-label="Discord"
            >
              <FaDiscord className="size-[17px]" />
            </a>
          )}
          {SOCIAL_LINKS.github && (
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="nx-icon-btn hidden sm:inline-grid"
              aria-label="GitHub"
            >
              <FaGithub className="size-4" />
            </a>
          )}

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8 ring-1 ring-white/20">
                    <AvatarImage src={currentUser.location?.flagSvgURL} className="h-full w-full object-cover" />
                    <AvatarFallback className="bg-primary-600 text-[11px] font-semibold">
                      {initialsOf(currentUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5 text-neutral-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{currentUser.username}</span>
                  <span className="text-[11px] font-normal text-neutral-400">
                    {isAdmin ? "Admin" : "Listener"} · Room {roomId}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-sm" onClick={() => void copyRoomLink()}>
                  <Link2 className="size-4" />
                  Copy room link
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 text-sm">
                  <Link href="/">
                    <LogOut className="size-4" />
                    Leave room
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  }

  // Use the existing SyncProgress component for loading/syncing states
  return (
    <AnimatePresence>
      {isLoadingAudio && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <SyncProgress />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
