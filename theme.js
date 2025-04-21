import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    error: '#cf6679',
    onBackground: '#ffffff',
    onSurface: '#ffffff',
    disabled: '#666666',
    placeholder: '#888888',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#ff80ab',
  },
  roundness: 8,
};

export const colors = {
  positive: '#4CAF50',
  negative: '#F44336',
  neutral: '#9E9E9E',
  cardBackground: '#1e1e1e',
  divider: '#333333',
}; 