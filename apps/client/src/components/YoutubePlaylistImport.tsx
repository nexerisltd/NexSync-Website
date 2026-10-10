"use client";

import { importYoutubePlaylist } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCanMutate, useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { ListMusic, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Paste a YouTube / YouTube Music playlist (or video) link and the server imports every
 * track into the room's queue. Progress comes from the shared "active stream jobs" counter.
 */
export const YoutubePlaylistImport = () => {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canMutate = useCanMutate();
  const roomId = useRoomStore((state) => state.roomId);
  const activeStreamJobs = useGlobalStore((state) => state.activeStreamJobs);

  const isDisabled = !canMutate;
  const isImporting = isSubmitting || activeStreamJobs > 0;

  const handleImport = async () => {
    const link = url.trim();
    if (isDisabled || isImporting || !link) return;

    try {
      setIsSubmitting(true);
      const result = await importYoutubePlaylist({ roomId, url: link });
      setUrl("");
      toast.success(
        result.queued === 0
          ? // cloud worker mode: the worker reads the playlist itself, so the count isn't known yet
            "Sent to the cloud worker — tracks will appear in the queue one by one as they finish"
          : `Importing ${result.queued} track${result.queued === 1 ? "" : "s"} — they'll appear in the queue as they finish` +
              (result.truncated ? " (playlist was longer than the import limit)" : "")
      );
    } catch (err) {
      console.error("YouTube import failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to import from YouTube");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "border border-neutral-700/50 rounded-md mx-2 mt-2 transition-all overflow-hidden",
        isDisabled ? "bg-neutral-800/20 opacity-50" : "bg-neutral-800/30"
      )}
      title={isDisabled ? "Admin-only mode - only admins can import" : undefined}
    >
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-md flex-shrink-0",
              isDisabled ? "bg-neutral-600 text-neutral-400" : "bg-primary-700 text-white"
            )}
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListMusic className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {isImporting
                ? activeStreamJobs > 0
                  ? `Importing… ${activeStreamJobs} left`
                  : "Reading playlist…"
                : "Import YouTube playlist"}
            </div>
            <div className={cn("text-xs truncate", isDisabled ? "text-neutral-500" : "text-neutral-400")}>
              {isDisabled ? "Must be an admin to import" : "Paste a YouTube / YT Music link"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleImport();
            }}
            disabled={isDisabled || isImporting}
            placeholder="https://music.youtube.com/playlist?list=…"
            className="flex-1 min-w-0 rounded-md bg-neutral-900/60 border border-neutral-700/50 px-2 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-primary-500 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isDisabled || isImporting || !url.trim()}
            className="rounded-md bg-primary-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
