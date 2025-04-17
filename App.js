import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { WatchlistProvider } from './context/WatchlistContext';
import { ThemeProvider, darkTheme } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import StockDetailScreen from './screens/StockDetailScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import { StatusBar, View } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: darkTheme.primary,
    background: darkTheme.background,
    card: darkTheme.card,
    text: darkTheme.text,
    border: darkTheme.border,
  },
};

const screenOptions = {
  headerStyle: {
    backgroundColor: darkTheme.surface,
  },
  headerTintColor: darkTheme.text,
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  tabBarStyle: {
    backgroundColor: darkTheme.tabBar,
    borderTopColor: darkTheme.border,
  },
  tabBarActiveTintColor: darkTheme.primary,
  tabBarInactiveTintColor: darkTheme.textSecondary,
  animationEnabled: false,
  gestureEnabled: false,
};

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="BullsEye"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'star' : 'star-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <WatchlistProvider>
          <StatusBar barStyle="light-content" backgroundColor={darkTheme.surface} />
          <NavigationContainer theme={DarkTheme}>
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen
                name="BullsEye Markets"
                component={TabNavigator}
                options={{
                  headerShown: true,
                  headerTitleAlign: 'center',
                }}
              />
              <Stack.Screen
                name="StockDetail"
                component={StockDetailScreen}
                options={({ route }) => ({
                  title: route.params.symbol,
                })}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </WatchlistProvider>
      </ThemeProvider>
    </View>
  );
} 