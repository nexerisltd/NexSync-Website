import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Queue } from "../Queue";
import { InlineSearch } from "./InlineSearch";

export const Main = () => {
  return (
    <motion.div className={cn("flex h-full min-h-0 w-full min-w-0 flex-col bg-transparent nx-panel lg:flex-1")}>
      {/* Search stays pinned; only the queue scrolls */}
      <div className="relative z-20 shrink-0 p-4 pb-2 lg:p-5 lg:pb-2">
        <InlineSearch />
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-3 pb-4 lg:px-4",
          "scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20"
        )}
      >
        <Queue />
      </div>
    </motion.div>
  );
};
