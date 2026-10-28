"use client";
import { create } from "zustand";

/** Who is broadcasting right now (null = nobody; the room plays its normal queue). */
export interface LiveInfo {
  broadcasterId?: string;
  broadcasterName?: string;
  playoutDelayMs: number;
}

interface LiveStore {
  info: LiveInfo | null;
  /** This device is the one capturing and sending audio. */
  isBroadcasting: boolean;
  /** Admin pressed Go Live and the browser capture picker / server handshake is in progress. */
  isStarting: boolean;
  /** Broadcaster: 0..1 input level. */
  level: number;
  setInfo: (info: LiveInfo | null) => void;
  setBroadcasting: (isBroadcasting: boolean) => void;
  setStarting: (isStarting: boolean) => void;
  setLevel: (level: number) => void;
}

export const useLiveStore = create<LiveStore>()((set) => ({
  info: null,
  isBroadcasting: false,
  isStarting: false,
  level: 0,
  setInfo: (info) => set({ info }),
  setBroadcasting: (isBroadcasting) => set({ isBroadcasting, ...(isBroadcasting ? {} : { level: 0 }) }),
  setStarting: (isStarting) => set({ isStarting }),
  setLevel: (level) => set({ level }),
}));
