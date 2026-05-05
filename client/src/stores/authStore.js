import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      login: (accessToken, refreshToken, user) => set({
        accessToken, refreshToken, user
      }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        user: null
      }),

      updateUser: (user) => set({ user }),

      isAuthenticated: () => !!get().accessToken,
      getRole: () => get().user?.role,
      getZoneIds: () => get().user?.zoneIds || [],
    }),
    {
      name: 'sems-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      })
    }
  )
);
