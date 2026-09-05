import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('vayusutra_theme', theme);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('vayusutra_theme') as Theme) || 'dark',

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return { theme: next };
    });
  },
}));