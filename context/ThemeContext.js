import React, { createContext, useContext } from 'react';

export const darkTheme = {
  background: '#7B7979',
  surface: '#1E1E1E',
  primary: '#BB86FC',
  text: '#FFFFFF',
 
  textSecondary: '#B3B3B3',
  positive: '#00E096',
  negative: '#FF4C4C',
  border: '#2C2C2C',
  card: '#1E1E1E',
  tabBar: '#1E1E1E',
};

export const ThemeContext = createContext(darkTheme);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={darkTheme}>
      {children}
    </ThemeContext.Provider>
  );
}; 