import { motion } from "motion/react";
import { Player } from "../room/Player";
import { GlobalVolumeControl } from "./GlobalVolumeControl";
import { NudgeControl } from "./NudgeControl";

export const Bottom = () => {
  return (
    <motion.div className="flex-shrink-0 glass-flat p-4 pb-safe-plus-4 z-10 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="hidden lg:block absolute left-6">
          <NudgeControl />
        </div>
        <div className="flex-1 max-w-3xl mx-auto">
          <Player />
        </div>
        <div className="hidden lg:block absolute right-6">
          <GlobalVolumeControl />
        </div>
      </div>
    </motion.div>
  );
};
