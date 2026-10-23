import { create } from 'zustand';

type AppState = {
  revision: number;
  periodStart: string | null;
  bump: () => void;
  setPeriodStart: (value: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  revision: 0,
  periodStart: null,
  bump: () => set((state) => ({ revision: state.revision + 1 })),
  setPeriodStart: (periodStart) => set({ periodStart }),
}));

/** For write paths outside React, e.g. after a database mutation. */
export function bumpData() {
  useAppStore.getState().bump();
}
