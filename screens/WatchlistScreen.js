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
import { useState, useCallback, useEffect } from 'react';

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
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        { headers }
      );
      
      if (!response.data.chart.result || response.data.chart.result.length === 0) {
        return null;
      }

      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];

      if (!meta || !quote) {
        return null;
      }

      const currentPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.chartPreviousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        currentPrice,
        change,
        changePercent,
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
      for (const stock of watchlist) {
        const data = await fetchStockData(stock.symbol);
        if (data) {
          updatedData[stock.symbol] = data;
        }
      }
      setStockData(updatedData);
    } catch (error) {
      console.error('Error refreshing watchlist:', error);
    }
    setRefreshing(false);
  }, [watchlist]);

  useEffect(() => {
    onRefresh();
  }, [watchlist]);

  const renderItem = ({ item }) => {
    const data = stockData[item.symbol];
    return (
      <TouchableOpacity
        style={styles.stockCard}
        onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })}
      >
        <View style={styles.stockInfo}>
          <Text style={styles.symbol}>{item.symbol.replace('.NS', '')}</Text>
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
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
              </Text>
            </>
          ) : (
            <ActivityIndicator size="small" color="#FFFFFF" />
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromWatchlist(item.symbol)}
        >
          <Ionicons name="close-circle" size={24} color="#F44336" />
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
    backgroundColor: '#000000',
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  stockInfo: {
    flex: 1,
    marginRight: 16,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  price: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  change: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
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
    color: '#999999',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
}); 