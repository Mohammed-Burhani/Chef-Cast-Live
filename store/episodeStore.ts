/**
 * Episode Context Store
 * Manages current live episode ID for quiz participation
 */

import { create } from 'zustand';

interface EpisodeState {
  currentLiveEpisodeId: string | null;
  setCurrentLiveEpisode: (episodeId: string | null) => void;
}

export const useEpisodeStore = create<EpisodeState>()((set) => ({
  currentLiveEpisodeId: null,
  
  setCurrentLiveEpisode: (episodeId) => {
    set({ currentLiveEpisodeId: episodeId });
  },
}));
