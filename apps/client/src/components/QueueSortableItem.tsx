import { cn, extractFileNameFromUrl, formatTime } from "@/lib/utils";
import { AudioSourceState, useGlobalStore } from "@/store/global";
import { sendWSRequest } from "@/utils/ws";
import { ClientActionEnum } from "@beatsync/shared";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, GripVertical, Loader2, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export const QueueSortableItem = ({
  id,
  sourceState,
  index,
  canMutate,
}: {
  id: string;
  sourceState: AudioSourceState;
  index: number;
  canMutate: boolean;
}) => {
  const getAudioDuration = useGlobalStore((state) => state.getAudioDuration);
  const selectedAudioUrl = useGlobalStore((state) => state.selectedAudioUrl);
  const changeAudioSource = useGlobalStore((state) => state.changeAudioSource);
  const broadcastPlay = useGlobalStore((state) => state.broadcastPlay);
  const broadcastPause = useGlobalStore((state) => state.broadcastPause);
  const isPlaying = useGlobalStore((state) => state.isPlaying);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedAudioUrl === sourceState.source.url;
  const isPlayingThis = isSelected && isPlaying;
  const isLoading = sourceState.status === "loading";
  const isError = sourceState.status === "error";

  // Only tracks whose audio is decoded know their length; the rest show a placeholder
  const duration = !isLoading && sourceState.status === "loaded" ? getAudioDuration({ url: sourceState.source.url }) : 0;

  const togglePlay = () => {
    if (!canMutate || isLoading || isError) return;

    const source = sourceState.source;
    if (source.url === selectedAudioUrl) {
      if (isPlaying) {
        broadcastPause();
      } else {
        broadcastPlay();
      }
    } else {
      changeAudioSource(source.url);
      broadcastPlay(0);
    }
  };

  const removeFromQueue = () => {
    const socket = useGlobalStore.getState().socket;
    if (!socket) return;
    sendWSRequest({
      ws: socket,
      request: {
        type: ClientActionEnum.enum.DELETE_AUDIO_SOURCES,
        urls: [sourceState.source.url],
      },
    });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        key={sourceState.source.url}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{
          opacity: 0,
          y: -10,
          transition: {
            duration: 0.25,
            ease: "easeInOut",
          },
        }}
        transition={
          isDragging
            ? {
                layout: { duration: 0.15, ease: "backOut" },
                opacity: { duration: 0.3, delay: Math.min(0.05 * index, 0.3), ease: "easeOut" },
                y: { duration: 0.3, delay: Math.min(0.05 * index, 0.3), ease: "easeOut" },
              }
            : {
                layout: { type: "spring", stiffness: 400, damping: 45, mass: 1 },
                opacity: { duration: 0.3, delay: Math.min(0.05 * index, 0.3), ease: "easeOut" },
                y: { duration: 0.3, delay: Math.min(0.05 * index, 0.3), ease: "easeOut" },
              }
        }
        className={cn(
          "nx-row group select-none gap-2 py-2.5 pr-3 pl-2",
          isSelected && !isLoading && !isError ? "nx-row-active text-white" : "text-neutral-200",
          !canMutate && "text-white/60",
          (isLoading || isError) && "cursor-not-allowed opacity-60",
          canMutate && !isLoading && !isError && "cursor-pointer",
          isDragging && "bg-white/10"
        )}
        onClick={togglePlay}
      >
        {/* Drag handle - only for users who can reorder */}
        {canMutate && (
          <motion.div
            {...listeners}
            className="hidden p-0.5 sm:block"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: isDragging ? 1 : 0.2 }}
            whileHover={{ opacity: 1 }}
            style={{ cursor: "grab", touchAction: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </motion.div>
        )}

        {/* Number chip: equalizer while playing, play/pause on hover */}
        <div className="nx-num relative shrink-0 cursor-default select-none">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-neutral-400" />
          ) : isError ? (
            <AlertCircle className="size-4 text-red-400" />
          ) : (
            <>
              <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                {isPlayingThis ? (
                  <Pause className="size-3.5 fill-current stroke-1" />
                ) : (
                  <Play className="size-3.5 fill-current" />
                )}
              </span>
              <span className="grid place-items-center transition-opacity group-hover:opacity-0">
                {isPlayingThis ? (
                  <span className="flex h-3.5 items-end gap-[2px]">
                    <span className="h-[40%] w-[2px] animate-[sound-wave-1_1.2s_ease-in-out_infinite] bg-primary-400" />
                    <span className="h-[80%] w-[2px] animate-[sound-wave-2_1.4s_ease-in-out_infinite] bg-primary-400" />
                    <span className="h-[60%] w-[2px] animate-[sound-wave-3_1s_ease-in-out_infinite] bg-primary-400" />
                  </span>
                ) : (
                  index + 1
                )}
              </span>
            </>
          )}
        </div>

        {/* Track name */}
        <div className="min-w-0 flex-1 select-none">
          <div
            className={cn(
              "truncate text-sm font-medium",
              isSelected && !isLoading && !isError && "text-primary-300",
              isError && "text-red-400",
              isLoading && "opacity-60"
            )}
            title={extractFileNameFromUrl(sourceState.source.url)}
          >
            {extractFileNameFromUrl(sourceState.source.url)}
            {isError && sourceState.error && <span className="ml-2 text-xs text-red-400">({sourceState.error})</span>}
          </div>
        </div>

        {/* Duration */}
        <div
          className={cn(
            "min-w-[3rem] select-none text-right text-xs tabular-nums",
            isSelected ? "text-primary-200" : "text-neutral-400"
          )}
        >
          {duration > 0 ? formatTime(duration) : <span className="text-neutral-600">--:--</span>}
        </div>

        {/* Row menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Track options"
              className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              className="gap-2 text-xs"
              disabled={!canMutate || isLoading || isError}
              onClick={togglePlay}
            >
              {isPlayingThis ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlayingThis ? "Pause" : "Play"}
            </DropdownMenuItem>
            {canMutate && (
              <DropdownMenuItem className="gap-2 text-xs text-red-400 focus:text-red-300" onClick={removeFromQueue}>
                <Trash2 className="size-3.5" />
                Remove from queue
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </div>
  );
};
