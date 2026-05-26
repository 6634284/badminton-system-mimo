import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    nickname: string;
    avatarUrl?: string;
    roles: string[];
  } | null;
  tenantId: string | null;

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthState['user']) => void;
  setTenantId: (tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenantId: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, tenantId: null }),
    }),
    {
      name: 'badminton-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        tenantId: state.tenantId,
      }),
    },
  ),
);
