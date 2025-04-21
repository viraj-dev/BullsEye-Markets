import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  IconButton,
  Text,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, colors } from '../theme';
import { getStockQuote } from '../services/stockService';
import { useRoute } from '@react-navigation/native';

const StockDetailScreen = () => {
  const route = useRoute();
  const { symbol, name } = route.params;
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        console.log('Fetching stock data for:', symbol);
        const data = await getStockQuote(symbol);
        console.log('Received stock data:', data);
        
        if (!data) {
          console.log('No data received from API');
          setError('Could not fetch stock data');
          return;
        }

        setStockData(data);
        setError(null);
      } catch (err) {
        console.error('Error in fetchStockData:', err);
        setError('Error fetching stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
    checkWishlistStatus();
  }, [symbol]);

  const checkWishlistStatus = async () => {
    try {
      const wishlist = await AsyncStorage.getItem('wishlist');
      const wishlistArray = wishlist ? JSON.parse(wishlist) : [];
      setIsWishlisted(wishlistArray.includes(symbol));
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    try {
      const wishlist = await AsyncStorage.getItem('wishlist');
      let wishlistArray = wishlist ? JSON.parse(wishlist) : [];

      if (isWishlisted) {
        wishlistArray = wishlistArray.filter(s => s !== symbol);
      } else {
        wishlistArray = [...wishlistArray, symbol];
      }

      await AsyncStorage.setItem('wishlist', JSON.stringify(wishlistArray));
      setIsWishlisted(!isWishlisted);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const formatNumber = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(2);
  };

  const formatVolume = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!stockData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.stockCard}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <Title style={styles.title}>{name}</Title>
              <Paragraph style={styles.stockSymbol}>{symbol}</Paragraph>
            </View>
            <IconButton
              icon={isWishlisted ? 'star' : 'star-outline'}
              size={24}
              onPress={toggleWishlist}
              color={isWishlisted ? '#FFD700' : '#FFFFFF'}
            />
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>₹{stockData.currentPrice.toFixed(2)}</Text>
            <Text style={[
              styles.priceChange,
              { color: stockData.change >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.percentChange.toFixed(2)}%)
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Open</Text>
              <Text style={styles.infoValue}>₹{formatNumber(stockData.open)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>High</Text>
              <Text style={styles.infoValue}>₹{formatNumber(stockData.high)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Low</Text>
              <Text style={styles.infoValue}>₹{formatNumber(stockData.low)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Volume</Text>
              <Text style={styles.infoValue}>{formatVolume(stockData.volume)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stockCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
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
    marginBottom: 16,
  },
  stockName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stockSymbol: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceChange: {
    fontSize: 18,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  infoContainer: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  infoLabel: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default StockDetailScreen;
