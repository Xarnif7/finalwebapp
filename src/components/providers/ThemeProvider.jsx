import React, { createContext, useContext } from 'react';

const ThemeProviderContext = createContext({
  theme: 'light',
  setTheme: () => null,
});

export function ThemeProvider({ children }) {
  // Force light theme only
  const value = {
    theme: 'light',
    setTheme: () => {}, // No-op since we're forcing light theme
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};


