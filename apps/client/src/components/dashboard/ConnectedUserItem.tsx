"use client";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { ClientDataType } from "@beatsync/shared";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { Crown, MoreVertical, User } from "lucide-react";
import { motion } from "motion/react";
import { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export interface ConnectedUserItemProps {
  client: ClientDataType;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onSetAdmin: (clientId: string, isAdmin: boolean) => void;
}

// Location content shared between Tooltip and Popover - extracted outside render
const LocationContent = ({ client }: { client: ClientDataType }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <div className="w-3 flex justify-center">
        {client.isAdmin ? (
          <Crown className="h-2.5 w-2.5 text-yellow-500" fill="currentColor" />
        ) : (
          <User className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <p className="font-medium text-xs text-foreground">{client.username}</p>
    </div>
    {client.location ? (
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 flex justify-center">
            <span className="text-sm">{client.location.flagEmoji}</span>
          </div>
          <span className="text-foreground/70">
            {[[client.location.city, client.location.region].filter(Boolean).join(", "), client.location.country]
              .filter(Boolean)
              .join(" • ")}
          </span>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="w-3"></div>
        <p className="text-xs text-muted-foreground/60 italic">No location data</p>
      </div>
    )}
  </div>
);

export const ConnectedUserItem = memo<ConnectedUserItemProps>(({ client, isCurrentUser, isAdmin, onSetAdmin }) => {
  const isMobile = useIsMobile();
  const [showLocation, setShowLocation] = useState(false);

  const avatarContent = (
    <div className="relative">
      <Avatar className="h-10 w-10 ring-1 ring-white/15">
        <AvatarImage src={client.location?.flagSvgURL} className="object-cover w-full h-full" />
        <AvatarFallback className={isCurrentUser ? "bg-primary-600" : "bg-white/10"}>
          {client.username
            .split("-")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}{" "}
        </AvatarFallback>
      </Avatar>
      {/* Online dot */}
      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0b1630] bg-green-400" />
    </div>
  );

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300 text-sm",
        client.isCreator
          ? "bg-sky-500/10 border-sky-400/20"
          : isCurrentUser
            ? "bg-white/5 border-white/10"
            : "bg-transparent border-transparent hover:bg-white/5"
      )}
      initial={{ opacity: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Conditionally render Tooltip (desktop) or Popover (mobile) */}
      {isMobile ? (
        <Popover open={showLocation} onOpenChange={setShowLocation}>
          <PopoverTrigger asChild>
            <button className="focus:outline-none" onClick={() => setShowLocation(!showLocation)}>
              {avatarContent}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="bg-background/95 backdrop-blur-sm border-border/50 px-3 py-2 font-mono w-auto"
          >
            <LocationContent client={client} />
          </PopoverContent>
        </Popover>
      ) : (
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              align="center"
              collisionPadding={8}
              className="bg-background/95 backdrop-blur-sm border-border/50 px-3 py-2 font-mono"
            >
              <LocationContent client={client} />
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate text-sm font-semibold text-white">{client.username}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="size-1.5 rounded-full bg-green-400" />
          {isCurrentUser ? "You" : "Connected"}
        </div>
      </div>
      {(client.isCreator || client.isAdmin) && (
        <Badge
          className={cn(
            "shrink-0 rounded-full border-0 px-3 py-0 h-6 text-xs font-medium",
            client.isCreator ? "bg-sky-600 text-sky-50" : "bg-primary-600 text-primary-50"
          )}
        >
          {client.isCreator ? "Creator" : "Admin"}
        </Badge>
      )}
      {/* Admin controls dropdown - only show if current user is admin and not targeting self */}
      {isAdmin && !isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/15">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {client.isAdmin ? (
              <DropdownMenuItem onClick={() => onSetAdmin(client.clientId, false)} className="text-xs">
                <Crown className="h-3 w-3 mr-2 text-red-500" />
                Remove Admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onSetAdmin(client.clientId, true)} className="text-xs">
                <Crown className="h-3 w-3 mr-2 text-green-500" />
                Make Admin
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
});

ConnectedUserItem.displayName = "ConnectedUserItem";
