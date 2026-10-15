import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Rotate3D } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Chat } from "./right/Chat";
import { SpatialAudio } from "./right/SpatialAudio";

const tabClass =
  "flex-1 gap-2 text-neutral-400 data-[state=active]:bg-white/10 dark:data-[state=active]:bg-white/10 data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:border-transparent";

export const Right = () => {
  return (
    <div className="flex h-full w-full flex-col glass-flat nx-panel lg:w-80 lg:flex-shrink-0 xl:w-[21rem]">
      <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-0">
        <TabsList className="m-3 mb-2 h-10 shrink-0 bg-white/5 p-1 rounded-xl">
          <TabsTrigger value="chat" className={tabClass}>
            <MessageCircle className="size-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="spatial" className={tabClass}>
            <Rotate3D className="size-3.5" />
            Spatial
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="min-h-0 flex-1 overflow-hidden">
          <Chat />
        </TabsContent>
        <TabsContent value="spatial" className="min-h-0 flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <SpatialAudio />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
