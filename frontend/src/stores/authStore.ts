import { create } from 'zustand';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('vayusutra_token', token);
    localStorage.setItem('vayusutra_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('vayusutra_token');
    localStorage.removeItem('vayusutra_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  loadFromStorage: () => {
    const token = localStorage.getItem('vayusutra_token');
    const userStr = localStorage.getItem('vayusutra_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('vayusutra_token');
        localStorage.removeItem('vayusutra_user');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));