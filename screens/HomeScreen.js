import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import { Card, Title, Paragraph, IconButton, Searchbar } from 'react-native-paper';
import { searchStocks, getStockQuote } from '../services/stockService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, colors } from '../theme';
import { useFocusEffect } from '@react-navigation/native';

const POPULAR_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' }
];

const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popularStocks, setPopularStocks] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadWishlist();
    loadPopularStocks();
  }, []);

  const loadWishlist = async () => {
    try {
      const wishlistData = await AsyncStorage.getItem('wishlist');
      if (wishlistData) {
        setWishlist(JSON.parse(wishlistData));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadPopularStocks = async () => {
    try {
      setLoading(true);
      const stocksWithData = await Promise.all(
        POPULAR_STOCKS.map(async (stock) => {
          try {
            const data = await getStockQuote(stock.symbol);
            return {
              ...stock,
              ...data
            };
          } catch (error) {
            console.error(`Error fetching data for ${stock.symbol}:`, error);
            return stock;
          }
        })
      );
      setPopularStocks(stocksWithData);
    } catch (error) {
      console.error('Error loading popular stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await searchStocks(text);
      console.log('Search results:', results);
      
      if (results && results.length > 0) {
        // Fetch data for each stock
        const stocksWithData = await Promise.all(
          results.map(async (stock) => {
            try {
              const data = await getStockQuote(stock.symbol);
              return {
                name: stock.name,
                symbol: stock.symbol,
                ...data
              };
            } catch (error) {
              console.error(`Error fetching data for ${stock.symbol}:`, error);
              return {
                name: stock.name,
                symbol: stock.symbol,
                currentPrice: 0,
                change: 0,
                percentChange: 0
              };
            }
          })
        );
        console.log('Stocks with data:', stocksWithData);
        setSearchResults(stocksWithData);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (symbol) => {
    try {
      let updatedWishlist;
      if (wishlist.includes(symbol)) {
        updatedWishlist = wishlist.filter(item => item !== symbol);
      } else {
        updatedWishlist = [...wishlist, symbol];
      }
      await AsyncStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
      setWishlist(updatedWishlist);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const renderStockItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol, name: item.name })}
    >
      <Card style={styles.stockCard}>
        <Card.Content>
          <View style={styles.stockHeader}>
            <View>
              <Title style={styles.stockName}>{item.name}</Title>
              <Paragraph style={styles.stockSymbol}>{item.symbol}</Paragraph>
            </View>
            <IconButton
              icon={wishlist.includes(item.symbol) ? 'star' : 'star-outline'}
              size={24}
              onPress={() => toggleWishlist(item.symbol)}
              color={wishlist.includes(item.symbol) ? '#FFD700' : '#FFFFFF'}
            />
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              ₹{item.currentPrice ? item.currentPrice.toFixed(2) : 'N/A'}
            </Text>
            <Text style={[
              styles.priceChange,
              { color: item.change >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {item.change ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) : 'N/A'} 
              ({item.percentChange ? item.percentChange.toFixed(2) : 'N/A'}%)
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Stock Market</Text>
      </View>
  
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search stocks..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#FFFFFF"
          placeholderTextColor="#B0B0B0"
        />
      </View>
  
      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
  
      {/* Empty State */}
      {!loading && searchQuery.length > 0 && searchResults.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stocks found</Text>
        </View>
      )}
  
      {/* Stock List */}
      <FlatList
        data={searchQuery ? searchResults : popularStocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]} // Add space for floating button
        ListHeaderComponent={
          !searchQuery && (
            <Text style={styles.sectionTitle}>Popular Stocks</Text>
          )
        }
      />
  
      {/* Floating Wishlist Button - Positioned outside other views */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('Wishlist')}
      >
        <View style={styles.buttonContent}>
          <IconButton
            icon="star"
            size={28}
            color="#121212"
            style={styles.starIcon}
          />
          <Text style={styles.buttonText}>Wishlist</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    flexDirection: 'row',          // Add this
    justifyContent: 'space-between', // Add this
    alignItems: 'center',          // Add this
  },
  wishlistButton: {
    marginRight: 4, // Adjust spacing as needed
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 10,
    marginLeft: -5,
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#1E1E1E',
  },
  searchBar: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    elevation: 0,
  },
  searchInput: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#B0B0B0',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
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
    marginBottom: 16,
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
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default HomeScreen;
