import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  direction: 'ltr' | 'rtl';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const { i18n } = useTranslation();

  // Initialize theme from localStorage or default to light
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'light';
  });

  // Use database theme if user is authenticated, otherwise use current theme
  const theme = (authState.user?.store?.theme as Theme) || currentTheme;
  const language = authState.user?.store?.language || 'en';
  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';

  // Update current theme when database theme changes
  useEffect(() => {
    if (authState.user?.store?.theme) {
      setCurrentTheme(authState.user.store.theme as Theme);
    }
  }, [authState.user?.store?.theme]);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', direction);
  }, [direction]);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <ThemeContext.Provider value={{ theme, direction }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
