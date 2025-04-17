import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useWatchlist } from '../context/WatchlistContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useState, useCallback } from 'react';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

export default function WatchlistScreen({ navigation }) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [refreshing, setRefreshing] = useState(false);
  const [stockData, setStockData] = useState({});

  const fetchStockData = async (symbol) => {
    try {
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=1d`,
        { headers }
      );
      const quote = response.data.chart.result[0].meta;
      return {
        currentPrice: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const updatedData = {};
      await Promise.all(
        watchlist.map(async (stock) => {
          const data = await fetchStockData(stock.symbol);
          if (data) {
            updatedData[stock.symbol] = data;
          }
        })
      );
      setStockData(updatedData);
    } catch (error) {
      console.error('Error refreshing watchlist:', error);
    }
    setRefreshing(false);
  }, [watchlist]);

  const renderItem = ({ item }) => {
    const data = stockData[item.symbol];
    return (
      <TouchableOpacity
        style={styles.stockCard}
        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
      >
        <View style={styles.stockInfo}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.priceInfo}>
          {data ? (
            <>
              <Text style={styles.price}>₹{data.currentPrice.toFixed(2)}</Text>
              <Text style={[
                styles.change,
                data.change >= 0 ? styles.positive : styles.negative
              ]}>
                {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
              </Text>
            </>
          ) : (
            <ActivityIndicator size="small" color="#007AFF" />
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromWatchlist(item.symbol)}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={watchlist}
        renderItem={renderItem}
        keyExtractor={(item) => item.symbol}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your watchlist is empty</Text>
            <Text style={styles.emptySubText}>Add stocks to track them here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockInfo: {
    flex: 1,
    marginRight: 16,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  name: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  price: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  change: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8e8e93',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 8,
  },
}); 