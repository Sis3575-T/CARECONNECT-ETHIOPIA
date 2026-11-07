import { useState, useEffect, useContext, useCallback } from 'react';
import { ThemeContext, THEME_MODES } from '../context/ThemeContext.jsx';

/**
 * CareConnect Ethiopia - useTheme Hook
 * Provides theme controls (theme, resolvedTheme, isDark, toggleTheme, setTheme).
 * Consumes ThemeContext if available, or falls back to local component-level state.
 */
export function useTheme(portalKey = 'health_centre') {
  const context = useContext(ThemeContext);

  // If inside ThemeProvider, return the context value
  if (context && context.setTheme) {
    return context;
  }

  // Standalone fallback if outside ThemeProvider
  const storageKey = `careconnect_${portalKey}_theme`;

  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(storageKey) || THEME_MODES.LIGHT;
      } catch {
        return THEME_MODES.LIGHT;
      }
    }
    return THEME_MODES.LIGHT;
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemIsDark(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const resolvedTheme = theme === THEME_MODES.SYSTEM 
    ? (systemIsDark ? THEME_MODES.DARK : THEME_MODES.LIGHT)
    : theme;

  const isDark = resolvedTheme === THEME_MODES.DARK;

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
      // safe fallback
    }
  }, [isDark, theme, storageKey]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const active = current === THEME_MODES.SYSTEM 
        ? (systemIsDark ? THEME_MODES.DARK : THEME_MODES.LIGHT)
        : current;
      return active === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    });
  }, [systemIsDark]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
  }, []);

  return {
    theme,
    resolvedTheme,
    isDark,
    toggleTheme,
    setTheme
  };
}

export default useTheme;
