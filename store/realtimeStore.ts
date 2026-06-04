/**
 * Realtime Connection Status Store
 * Tracks connection status for all active channels
 */

import { create } from 'zustand';
import type { ConnectionStatus } from '@/lib/realtime/types';

interface RealtimeState {
  connectionStatuses: Record<string, ConnectionStatus>;
  setConnectionStatus: (channelName: string, status: ConnectionStatus) => void;
  isAnyChannelFailed: () => boolean;
}

export const useRealtimeStore = create<RealtimeState>()((set, get) => ({
  connectionStatuses: {},

  setConnectionStatus: (channelName, status) => {
    set((state) => ({
      connectionStatuses: {
        ...state.connectionStatuses,
        [channelName]: status,
      },
    }));
  },

  isAnyChannelFailed: () => {
    const statuses = Object.values(get().connectionStatuses);
    return statuses.some((status) => status === 'failed');
  },
}));
