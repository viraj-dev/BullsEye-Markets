import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WatchlistContext = createContext();

export const WatchlistProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem('watchlist');
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const addToWatchlist = async (stock) => {
    try {
      const updatedWatchlist = [...watchlist, stock];
      setWatchlist(updatedWatchlist);
      await AsyncStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (symbol) => {
    try {
      const updatedWatchlist = watchlist.filter(item => item.symbol !== symbol);
      setWatchlist(updatedWatchlist);
      await AsyncStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const isInWatchlist = (symbol) => {
    return watchlist.some(item => item.symbol === symbol);
  };

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist
    }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => useContext(WatchlistContext); 