import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,
  unreadCount: 0,
  setAuth: (accessToken, user) => set({ accessToken, user, isInitializing: false }),
  setUser: (user) => set({ user }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  clear: () => set({ accessToken: null, user: null, isInitializing: false, unreadCount: 0 }),
  setInitialized: () => set({ isInitializing: false }),
}));
