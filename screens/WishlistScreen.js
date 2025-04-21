import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  IconButton,
  Text,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import { getStockQuote } from '../services/stockService';
import { useFocusEffect } from '@react-navigation/native';

const WishlistScreen = ({ navigation }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh wishlist when the screen focuses
  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [])
  );

  // Function to load and fetch wishlist data
  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = await AsyncStorage.getItem('wishlist');
      const symbols = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(symbols) || symbols.length === 0) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      const stocksData = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await getStockQuote(symbol);
            return {
              symbol,
              name: data.longName || data.shortName || symbol,
              currentPrice: data.currentPrice ?? null,
              change: data.change ?? null,
              percentChange: data.percentChange ?? null,
            };
          } catch (err) {
            console.error(`Failed to fetch ${symbol}:`, err);
            return { 
              symbol,
              name: symbol,
              currentPrice: null,
              change: null,
              percentChange: null,
              error: true 
            };
          }
        })
      );

      // Only include entries without fetch errors
      setWishlist(stocksData.filter((item) => !item.error));
    } catch (e) {
      console.error('Wishlist load error:', e);
      setError('Could not load wishlist. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Remove a stock from wishlist
  const removeFromWishlist = useCallback(async (symbol) => {
    try {
      const stored = await AsyncStorage.getItem('wishlist');
      const symbols = stored ? JSON.parse(stored) : [];
      const updated = symbols.filter((s) => s !== symbol);
      await AsyncStorage.setItem('wishlist', JSON.stringify(updated));
      setWishlist((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (e) {
      console.error('Removal error:', e);
      setError('Could not remove item. Try again.');
    }
  }, []);

  // Render each stock item
  const renderStockItem = ({ item }) => (
    <Card
      style={styles.stockCard}
      onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
    >
      <Card.Content>
        <View style={styles.stockHeader}>
          <View>
            <Title style={styles.stockName}>{item.name}</Title>
            <Paragraph style={styles.stockSymbol}>{item.symbol}</Paragraph>
          </View>
          <IconButton
            icon="star"
            size={24}
            onPress={() => removeFromWishlist(item.symbol)}
            color="#FFD700"
          />
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>
            {item.currentPrice != null ? `₹${item.currentPrice.toFixed(2)}` : 'N/A'}
          </Text>
          <Text
            style={[
              styles.pricePercent,
              item.percentChange != null &&
                (item.percentChange >= 0 ? styles.positive : styles.negative),
            ]}
          >
            {item.percentChange != null
              ? `${item.percentChange >= 0 ? '+' : ''}${item.percentChange.toFixed(2)}%`
              : 'N/A'}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Wishlist</Title>
      </View>

      <FlatList
        data={wishlist}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No stocks in your wishlist</Text>
          </View>
        )}
        refreshing={loading}
        onRefresh={loadWishlist}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  list: {
    paddingBottom: 80,
  },
  stockCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stockSymbol: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pricePercent: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  emptyText: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
});

export default WishlistScreen;

