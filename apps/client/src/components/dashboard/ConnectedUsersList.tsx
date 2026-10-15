"use client";
import { useClientId } from "@/hooks/useClientId";
import { useGlobalStore } from "@/store/global";
import { useRoomTotals } from "@/store/roomTotals";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { Navigation, Users } from "lucide-react";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { ConnectedUserItem } from "./ConnectedUserItem";

export const ConnectedUsersList = () => {
  const { clientId } = useClientId();
  const clients = useGlobalStore((state) => state.connectedClients);
  const connectedTotal = useRoomTotals((state) => state.total);
  // const reorderClient = useGlobalStore((state) => state.reorderClient);
  const setAdminStatus = useGlobalStore((state) => state.setAdminStatus);

  // Get current user from global store
  const currentUser = useGlobalStore((state) => state.currentUser);
  const isCurrentUserAdmin = currentUser?.isAdmin || false;

  // Memoize client data to avoid unnecessary recalculations
  const clientsWithData = useMemo(() => {
    return clients.map((client) => {
      const isCurrentUser = client.clientId === clientId;
      return { client, isCurrentUser };
    });
  }, [clients, clientId]);

  return (
    <TooltipProvider>
      <div className="">
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="nx-section">
            <Users className="size-3.5" />
            Connected Users
          </h2>
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Navigation className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-xs font-mono p-2">
                    Locations are estimated from IP addresses using public geolocation databases. Accuracy varies by
                    region.
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-2 py-0.5 text-xs font-medium text-white">
              <span className="size-1.5 rounded-full bg-green-400" />
              {Math.max(connectedTotal, clients.length)}
            </span>
          </div>
        </div>

        <div className="px-4 pb-3">
          {clients.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">No other users connected</div>
          ) : (
            <div className="space-y-2">
              {/* List of connected users - Constrained height */}
              <div className="relative mt-2.5">
                <div className="space-y-1 overflow-y-auto flex-shrink-0 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/20 -mx-1">
                  {clientsWithData.map(({ client, isCurrentUser }) => (
                    <ConnectedUserItem
                      key={client.clientId}
                      client={client}
                      isCurrentUser={isCurrentUser}
                      isAdmin={isCurrentUserAdmin}
                      onSetAdmin={setAdminStatus}
                    />
                  ))}
                </div>
                {connectedTotal > clients.length && (
                  <p className="px-1 pt-1.5 text-[11px] text-neutral-400">
                    +{connectedTotal - clients.length} more listening
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
