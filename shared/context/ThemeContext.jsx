import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * CareConnect Ethiopia - Theme Context
 * Manages theme state (light, dark, system), listens for OS theme changes,
 * persists user preference per portal, and prevents theme-flickering.
 */

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

export const ThemeContext = createContext({
  theme: THEME_MODES.LIGHT,
  resolvedTheme: THEME_MODES.LIGHT,
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {}
});

export function ThemeProvider({ children, portalKey = 'health_centre', defaultTheme = THEME_MODES.LIGHT }) {
  const storageKey = `careconnect_${portalKey}_theme`;

  // Read stored preference safely
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  // Track system preference
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Compute resolved theme
  const resolvedTheme = theme === THEME_MODES.SYSTEM 
    ? (systemIsDark ? THEME_MODES.DARK : THEME_MODES.LIGHT)
    : theme;

  const isDark = resolvedTheme === THEME_MODES.DARK;

  // Apply .dark class to root document element and persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [isDark, theme, storageKey]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const active = current === THEME_MODES.SYSTEM 
        ? (systemIsDark ? THEME_MODES.DARK : THEME_MODES.LIGHT) 
        : current;
      return active === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    });
  }, [systemIsDark]);

  const value = {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
