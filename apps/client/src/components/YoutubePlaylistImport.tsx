"use client";

import { importYoutubePlaylist } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCanMutate, useGlobalStore } from "@/store/global";
import { useRoomStore } from "@/store/room";
import { ClipboardPaste, ListMusic, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Paste a YouTube / YouTube Music playlist (or song) link and the server imports every track into the
 * room's queue. Progress comes from the shared "active stream jobs" counter.
 */
export const YoutubePlaylistImport = () => {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canMutate = useCanMutate();
  const roomId = useRoomStore((state) => state.roomId);
  const activeStreamJobs = useGlobalStore((state) => state.activeStreamJobs);

  // Biggest "tracks left" value seen during this import = the total, so we can draw a real progress bar
  const peakJobs = useRef(0);
  useEffect(() => {
    if (activeStreamJobs > peakJobs.current) peakJobs.current = activeStreamJobs;
    if (activeStreamJobs === 0 && !isSubmitting) peakJobs.current = 0;
  }, [activeStreamJobs, isSubmitting]);

  const isDisabled = !canMutate;
  const isImporting = isSubmitting || activeStreamJobs > 0;
  const total = peakJobs.current;
  const progress = total > 0 ? Math.min(100, Math.round(((total - activeStreamJobs) / total) * 100)) : 0;

  const handleImport = async (rawLink = url) => {
    const link = rawLink.trim();
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

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return toast.info("Clipboard is empty");
      setUrl(text);
    } catch {
      toast.error("Couldn't read the clipboard — paste the link into the box instead");
    }
  };

  return (
    <div
      className={cn("glass mx-2 mt-2 overflow-hidden rounded-2xl transition-opacity", isDisabled && "opacity-50")}
      title={isDisabled ? "Admin-only mode - only admins can import" : undefined}
    >
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex-shrink-0 rounded-xl p-2",
              isDisabled
                ? "bg-white/5 text-neutral-500"
                : "bg-gradient-to-br from-primary-500 to-violet-500 text-white shadow-lg shadow-primary-700/30"
            )}
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListMusic className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-white">
              {isImporting
                ? activeStreamJobs > 0
                  ? `Importing… ${activeStreamJobs} left`
                  : "Reading playlist…"
                : "Import YouTube playlist"}
            </div>
            <div className={cn("truncate text-xs", isDisabled ? "text-neutral-500" : "text-neutral-400")}>
              {isDisabled ? "Must be an admin to import" : "Playlist or single song, YouTube or YT Music"}
            </div>
          </div>
        </div>

        {isImporting && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-cyan-300 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(progress, 6)}%` }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
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
              className="w-full rounded-xl border border-white/12 bg-black/20 py-1.5 pr-8 pl-2.5 text-xs text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-primary-400 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => void pasteFromClipboard()}
              disabled={isDisabled || isImporting}
              title="Paste from clipboard"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <ClipboardPaste className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isDisabled || isImporting || !url.trim()}
            className="nx-btn rounded-xl px-3.5 py-1.5 text-xs font-medium"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
