import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Rotate3D } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Chat } from "./right/Chat";
import { SpatialAudio } from "./right/SpatialAudio";

const tabClass =
  "flex-1 gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent py-3 text-sm font-medium text-neutral-400 shadow-none transition-colors hover:text-white data-[state=active]:border-primary-400 data-[state=active]:bg-primary-500/10 data-[state=active]:text-white data-[state=active]:shadow-none dark:data-[state=active]:bg-primary-500/10 dark:data-[state=active]:border-primary-400";

export const Right = () => {
  return (
    <div className="flex h-full w-full flex-col glass-flat nx-panel lg:w-80 lg:flex-shrink-0 xl:w-[21rem]">
      <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col gap-0">
        <TabsList className="h-auto w-full shrink-0 gap-0 rounded-none border-b border-white/8 bg-transparent p-0">
          <TabsTrigger value="chat" className={tabClass}>
            <MessageCircle className="size-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="spatial" className={tabClass}>
            <Rotate3D className="size-4" />
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
