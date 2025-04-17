import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen({ navigation }) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchStocks = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=LEAXYWWPPZHZK2G5`
      );

      if (response.data.bestMatches) {
        const indianStocks = response.data.bestMatches.filter(
          stock => stock['4. region'] === 'India'
        );

        setSearchResults(indianStocks.map(stock => ({
          symbol: stock['1. symbol'].replace('.BSE', ''),
          name: stock['2. name'],
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setError('Failed to search stocks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStockItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.stockItem, { backgroundColor: theme.surface }]}
      onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
    >
      <View style={styles.stockInfo}>
        <Text style={[styles.stockSymbol, { color: theme.text }]}>{item.symbol}</Text>
        <Text style={[styles.stockName, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search Indian stocks..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchStocks(text);
          }}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.primary} />
      ) : error ? (
        <Text style={[styles.errorText, { color: theme.negative }]}>{error}</Text>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderStockItem}
          keyExtractor={(item) => item.symbol}
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <Text style={[styles.noResults, { color: theme.textSecondary }]}>
                No stocks found
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 17,
    fontWeight: '600',
  },
  stockName: {
    fontSize: 14,
    marginTop: 4,
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
}); 