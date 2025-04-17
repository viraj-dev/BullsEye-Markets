import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

const popularStocks = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.' }
];

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length >= 1) {
      searchStocks(text);
    } else {
      fetchStocks();
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting to fetch stocks...');

      const popularStocks = [
        'RELIANCE.NS',
        'TCS.NS',
        'HDFCBANK.NS',
        'INFY.NS',
        'ICICIBANK.NS'
      ];

      const stockPromises = popularStocks.map(async (symbol) => {
        console.log(`Fetching data for ${symbol}`);
        try {
          const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
          );

          console.log(`Response for ${symbol}:`, JSON.stringify(response.data, null, 2));

          if (!response.data.chart.result || response.data.chart.result.length === 0) {
            console.warn(`No data found for ${symbol}`);
            return null;
          }

          const stockData = response.data.chart.result[0];
          const meta = stockData.meta;
          const quote = stockData.indicators.quote[0];

          if (!meta || !quote) {
            console.warn(`Invalid data structure for ${symbol}`);
            return null;
          }

          const currentPrice = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose;
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;

          return {
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || symbol,
            price: currentPrice?.toString() || '0.00',
            change: change?.toString() || '0.00',
            changePercent: changePercent?.toString() || '0.00'
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      });

      const stocks = (await Promise.all(stockPromises)).filter(Boolean);
      console.log('All stocks fetched:', JSON.stringify(stocks, null, 2));

      if (stocks.length === 0) {
        setError('No valid stock data found');
        return;
      }

      setStocks(stocks);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setError('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async (query) => {
    if (!query.trim()) {
      setStocks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Searching for:', query);
      
      // First try searching with .NS suffix
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=20&newsCount=0`
      );

      console.log('Search response:', JSON.stringify(response.data, null, 2));

      let searchResults = [];
      
      if (response.data.quotes && response.data.quotes.length > 0) {
        // Filter for Indian stocks and create a more flexible matching system
        const indianStocks = response.data.quotes
          .filter(stock => {
            const stockName = (stock.longname || stock.shortname || stock.symbol).toLowerCase();
            const queryLower = query.toLowerCase();
            
            // Check if the stock name contains the search query
            const nameMatch = stockName.includes(queryLower);
            
            // Check if it's an Indian stock
            const isIndianStock = stock.symbol.endsWith('.NS') || 
                                 stock.symbol.endsWith('.BO') || 
                                 stock.exchange === 'NSI' || 
                                 stock.exchange === 'BSE';
            
            return nameMatch && isIndianStock;
          })
          .map(stock => {
            // Format the symbol correctly
            let formattedSymbol = stock.symbol;
            if (stock.exchange === 'BSE' && !stock.symbol.endsWith('.BO')) {
              formattedSymbol = `${stock.symbol}.BO`;
            } else if (stock.exchange === 'NSI' && !stock.symbol.endsWith('.NS')) {
              formattedSymbol = `${stock.symbol}.NS`;
            }
            
            return {
              symbol: formattedSymbol,
              name: stock.longname || stock.shortname || stock.symbol,
              exchange: stock.exchange,
              type: stock.typeDisp
            };
          });

        if (indianStocks.length > 0) {
          searchResults = indianStocks;
        }
      }

      // If no results found with exact match, try partial match from our popular stocks
      if (searchResults.length === 0) {
        const queryLower = query.toLowerCase();
        const partialMatches = popularStocks.filter(stock => {
          const stockName = stock.name.toLowerCase();
          const stockSymbol = stock.symbol.toLowerCase();
          
          // Check if the stock name or symbol contains any part of the search query
          return stockName.includes(queryLower) || stockSymbol.includes(queryLower);
        });
        
        if (partialMatches.length > 0) {
          searchResults = partialMatches.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            exchange: 'NSI',
            type: 'Equity'
          }));
        }
      }

      // If still no results, try fuzzy matching with popular stocks
      if (searchResults.length === 0) {
        const queryLower = query.toLowerCase();
        const fuzzyMatches = popularStocks.filter(stock => {
          const stockName = stock.name.toLowerCase();
          // Check if any word in the stock name starts with the search query
          return stockName.split(' ').some(word => word.startsWith(queryLower));
        });
        
        if (fuzzyMatches.length > 0) {
          searchResults = fuzzyMatches.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            exchange: 'NSI',
            type: 'Equity'
          }));
        }
      }

      if (searchResults.length === 0) {
        setStocks([]);
        setError('No stocks found. Try a different search term.');
        return;
      }

      console.log('Filtered Indian stocks:', searchResults);
      
      // Fetch price data for each search result
      const stocksWithData = await Promise.all(
        searchResults.map(async (stock) => {
          try {
            const priceResponse = await axios.get(
              `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=1d`
            );
            
            if (!priceResponse.data.chart.result || priceResponse.data.chart.result.length === 0) {
              console.log(`No data available for ${stock.symbol}`);
              return null;
            }

            const result = priceResponse.data.chart.result[0];
            const quote = result.meta;
            const previousClose = result.meta.chartPreviousClose;
            
            if (quote && quote.regularMarketPrice) {
              const currentPrice = quote.regularMarketPrice;
              const change = currentPrice - previousClose;
              const changePercent = (change / previousClose) * 100;

              return {
                ...stock,
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
              };
            }

            return null;
          } catch (error) {
            console.error(`Error fetching price for ${stock.symbol}:`, error);
            return null;
          }
        })
      );

      // Filter out null results and stocks with no data
      const validStocks = stocksWithData.filter(stock => stock !== null && stock.price > 0);
      
      if (validStocks.length === 0) {
        setError('No stocks found with valid price data.');
        setStocks([]);
      } else {
        setStocks(validStocks);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setError('Failed to search stocks. Please try again.');
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStockItem = ({ item }) => {
    if (!item) return null;
    
    console.log('Rendering stock item:', item);
    const change = parseFloat(item.change);
    const changePercent = parseFloat(item.changePercent);
    
    return (
      <TouchableOpacity
        style={[styles.stockItem, { backgroundColor: '#FFFFFF' }]}
        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
      >
        <View style={styles.stockInfo}>
          <Text style={[styles.stockSymbol, { color: '#000000' }]}>
            {item.symbol.replace('.NS', '').replace('.BO', '')}
          </Text>
          <Text style={[styles.stockName, { color: '#666666' }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.stockPriceContainer}>
          <Text style={[styles.stockPrice, { color: '#000000' }]}>
            {item.price > 0 ? `₹${item.price}` : 'N/A'}
          </Text>
          {item.price > 0 && !isNaN(change) && !isNaN(changePercent) && (
            <View style={[
              styles.changeContainer,
              { backgroundColor: change >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.changeText}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    console.log('HomeScreen mounted, fetching stocks...');
    fetchStocks();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search stocks..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading stocks...</Text>
        </View>
      ) : error ? (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      ) : (
        <ScrollView style={styles.stockList}>
          {searchQuery ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Search Results</Text>
              {stocks.length > 0 ? (
                stocks.map((stock) => {
                  const change = parseFloat(stock.change);
                  const changePercent = parseFloat(stock.changePercent);
                  return (
                    <TouchableOpacity
                      key={stock.symbol}
                      style={[styles.stockCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => navigation.navigate('StockDetail', { symbol: stock.symbol })}
                    >
                      <Text style={[styles.stockName, { color: theme.text }]}>{stock.name}</Text>
                      <Text style={[styles.stockSymbol, { color: theme.textSecondary }]}>{stock.symbol}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.stockPrice, { color: theme.text }]}>
                          ₹{parseFloat(stock.price).toLocaleString('en-IN')}
                        </Text>
                        <Text
                          style={[
                            styles.priceChange,
                            change >= 0 ? styles.priceChangePositive : styles.priceChangeNegative,
                          ]}
                        >
                          {change >= 0 ? '+' : ''}
                          {change.toFixed(2)}% ({change >= 0 ? '↑' : '↓'})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.noResults, { color: theme.textSecondary }]}>No stocks found</Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Stocks</Text>
              {stocks.map((stock) => {
                const change = parseFloat(stock.change);
                const changePercent = parseFloat(stock.changePercent);
                return (
                  <TouchableOpacity
                    key={stock.symbol}
                    style={[styles.stockCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('StockDetail', { symbol: stock.symbol })}
                  >
                    <Text style={[styles.stockName, { color: theme.text }]}>{stock.name}</Text>
                    <Text style={[styles.stockSymbol, { color: theme.textSecondary }]}>{stock.symbol}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.stockPrice, { color: theme.text }]}>
                        ₹{parseFloat(stock.price).toLocaleString('en-IN')}
                      </Text>
                      <Text
                        style={[
                          styles.priceChange,
                          change >= 0 ? styles.priceChangePositive : styles.priceChangeNegative,
                        ]}
                      >
                        {change >= 0 ? '+' : ''}
                        {change.toFixed(2)}% ({change >= 0 ? '↑' : '↓'})
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  stockList: {
    paddingHorizontal: 16,
  },
  stockCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 14,
    marginBottom: 8,
  },
  stockPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceChange: {
    fontSize: 14,
    marginLeft: 8,
  },
  priceChangePositive: {
    color: '#4CAF50',
  },
  priceChangeNegative: {
    color: '#F44336',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
  },
}); 