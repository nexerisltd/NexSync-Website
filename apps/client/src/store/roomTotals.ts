import { create } from "zustand";

/**
 * Real head-count of the room. In big rooms the server only lists a few people, so connectedClients.length is
 * smaller than the number of listeners; the server sends the true number as `totalClients`.
 */
interface RoomTotalsState {
  total: number;
  setTotal: (total: number) => void;
}

export const useRoomTotals = create<RoomTotalsState>((set) => ({
  total: 0,
  setTotal: (total) => set({ total }),
}));
