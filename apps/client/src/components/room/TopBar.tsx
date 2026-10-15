"use client";
import { SOCIAL_LINKS } from "@/constants";
import { audioContextManager } from "@/lib/audioContextManager";
import { MAX_NTP_MEASUREMENTS, useGlobalStore } from "@/store/global";
import { useRoomTotals } from "@/store/roomTotals";
import { Activity, ChevronDown, Clock, Crown, Headphones, Link2, LogOut, Radio, Users, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { InstallAppButton } from "../InstallAppButton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
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
      <div className="z-50 flex h-14 items-center justify-between gap-3 px-3 glass-flat lg:h-[4.5rem] lg:bg-none lg:px-6 lg:shadow-none">
        {/* Left: brand + room + live stats */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <Link href="/" className="mr-1 flex shrink-0 items-center gap-2.5 text-white transition-opacity hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-8 lg:size-10" />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline lg:text-xl">NexSync</span>
          </Link>

          <span className="nx-pill" title="Room code">
            <Radio className="size-4" />
            Room {roomId}
          </span>

          <span className="nx-pill hidden xl:inline-flex" title="Clock-sync measurements">
            <Activity className="size-4" />
            {syncMeasurementCount}/{MAX_NTP_MEASUREMENTS}
          </span>

          <span className="nx-pill" title="Listeners in this room">
            <Users className="size-4" />
            {connectedClientCount} {connectedClientCount === 1 ? "User" : "Users"}
          </span>

          {isAdmin && (
            <span className="nx-pill hidden md:inline-flex" title="You can control playback">
              <Crown className="size-4 !text-yellow-400" fill="currentColor" />
              Admin
            </span>
          )}

          <span className="nx-pill hidden lg:inline-flex" title="Clock offset to the server">
            <Clock className="size-4" />
            Offset: {clockOffset.toFixed(2)}ms
          </span>
          <span className="nx-pill hidden lg:inline-flex" title="Round-trip time to the server">
            <Wifi className="size-4" />
            RTT: {roundTripEstimate.toFixed(2)}ms
          </span>
          <span className="nx-pill hidden xl:inline-flex" title="Audio output latency of this device">
            <Headphones className="size-4" />
            OL: {((audioContextManager.getContext().outputLatency ?? 0) * 1000).toFixed(0)}ms
          </span>
        </div>

        {/* Right: install, social, account */}
        <div className="flex shrink-0 items-center gap-1.5">
          <InstallAppButton />
          {SOCIAL_LINKS.discord && (
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="nx-icon-btn hidden sm:inline-grid"
              aria-label="Discord"
            >
              <FaDiscord className="size-[18px]" />
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
              <FaGithub className="size-[18px]" />
            </a>
          )}

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                  aria-label="Account menu"
                >
                  <Avatar className="size-9 ring-2 ring-white/15">
                    <AvatarImage src={currentUser.location?.flagSvgURL} className="h-full w-full object-cover" />
                    <AvatarFallback className="bg-primary-600 text-xs font-semibold">
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
