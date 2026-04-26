import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  setAuth: (accessToken, user) => set({ accessToken, user, isInitializing: false }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null, isInitializing: false }),
  setInitialized: () => set({ isInitializing: false }),
}));
