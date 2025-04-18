import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useWatchlist } from '../context/WatchlistContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { LineChart, Grid } from 'react-native-svg-charts';

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  change: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chart: {
    marginTop: 8,
    padding: 8,
  },
  detailsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  detailsLabel: {
    fontSize: 16,
    color: '#999999',
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#F44336',
  },
  watchlistButton: {
    padding: 8,
  },
});

export default function StockDetailScreen({ route, navigation }) {
  const { symbol } = route.params;
  const theme = useTheme();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [timeRange, setTimeRange] = useState('1d');
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (stockData) {
      console.log("chartPreviousClose value:", stockData?.chartPreviousClose, typeof stockData?.chartPreviousClose);
    }
    setInWatchlist(isInWatchlist(symbol));
  }, [symbol, isInWatchlist]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching stock data for:', symbol);

      // Fetch historical data for the chart
      const chartResponse = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${timeRange}`
      );

      if (chartResponse.data.chart.result && chartResponse.data.chart.result.length > 0) {
        const result = chartResponse.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const prices = result.indicators.quote[0]?.close || [];

        if (timestamps.length > 0 && prices.length > 0) {
          // Prepare data for the chart
          const chartData = {
            labels: timestamps.map(timestamp => {
              const date = new Date(timestamp * 1000);
              return timeRange === '1d' 
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }),
            datasets: [{
              data: prices,
              color: (opacity = 1) => theme.primary,
              strokeWidth: 2
            }]
          };
          setChartData(chartData);
        }
      }

      // Fetch current stock data
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );

      if (!response.data.chart.result || response.data.chart.result.length === 0) {
        setError('No data available for this stock');
        return;
      }

      const stockData = response.data.chart.result[0];
      const meta = stockData.meta;
      const quote = stockData.indicators.quote[0];

      if (!meta || !quote) {
        setError('Invalid stock data received');
        return;
      }

      const currentPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.chartPreviousClose || 0;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      setStockData({
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        price: currentPrice.toString(),
        change: change.toString(),
        changePercent: changePercent.toString(),
        high: (meta.regularMarketDayHigh || 0).toString(),
        low: (meta.regularMarketDayLow || 0).toString(),
        volume: (meta.regularMarketVolume || 0).toString(),
        marketCap: (meta.marketCap || 0).toString(),
        peRatio: (meta.trailingPE || 0).toString(),
        eps: (meta.epsTrailingTwelveMonths || 0).toString(),
        dividendYield: (meta.dividendYield || 0).toString(),
        chartPreviousClose: previousClose.toString(),
        open: (quote.open?.[0] || 0).toString(),
      });
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setError('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [symbol, timeRange]);

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await removeFromWatchlist(symbol);
    } else {
      await addToWatchlist({
        symbol,
        name: stockData.name,
      });
    }
    setInWatchlist(!inWatchlist);
  };

  const TimeRangeButton = ({ range, label }) => (
    <TouchableOpacity
      style={[
        styles.timeRangeButton,
        timeRange === range && { backgroundColor: theme.primary, borderColor: theme.primary }
      ]}
      onPress={() => setTimeRange(range)}
    >
      <Text style={[
        styles.timeRangeButtonText,
        { color: timeRange === range ? '#FFFFFF' : '#999999' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderChart = () => {
    if (!chartData || !chartData.datasets || !chartData.datasets[0].data) {
      return null;
    }

    const data = chartData.datasets[0].data;
    const contentInset = { top: 20, bottom: 20 };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.timeRangeContainer}>
          <TimeRangeButton range="1d" label="1D" />
          <TimeRangeButton range="5d" label="5D" />
          <TimeRangeButton range="1mo" label="1M" />
          <TimeRangeButton range="3mo" label="3M" />
          <TimeRangeButton range="1y" label="1Y" />
        </View>
        <LineChart
          style={{ height: 220, width: screenWidth - 64 }}
          data={data}
          svg={{ stroke: theme.primary }}
          contentInset={contentInset}
        >
          <Grid />
        </LineChart>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.symbol, { color: theme.text }]}>{stockData.symbol}</Text>
          <TouchableOpacity onPress={toggleWatchlist} style={styles.watchlistButton}>
            <Ionicons 
              name={inWatchlist ? "star" : "star-outline"} 
              size={24} 
              color={inWatchlist ? theme.primary : theme.text} 
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.price, { color: theme.text }]}>
          ₹{parseFloat(stockData.price).toFixed(2)}
        </Text>
        <Text
          style={[
            styles.change,
            parseFloat(stockData.change) >= 0
              ? { color: '#4CAF50' }
              : { color: '#F44336' }
          ]}
        >
          {parseFloat(stockData.change) >= 0 ? '+' : ''}
          {parseFloat(stockData.change).toFixed(2)} (
          {parseFloat(stockData.changePercent).toFixed(2)}%)
        </Text>
      </View>

      {renderChart()}

      <View style={[styles.detailsContainer, { 
        backgroundColor: theme.card,
        borderColor: theme.border 
      }]}>
        <Text style={[styles.detailsTitle, { color: theme.text }]}>Stock Details</Text>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Previous Close</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>
            ₹{stockData.chartPreviousClose.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Open</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>
            ₹{parseFloat(stockData.open).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>High</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>
            ₹{parseFloat(stockData.high).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Low</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>
            ₹{parseFloat(stockData.low).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Volume</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>{stockData.volume}</Text>
        </View>
      </View>
    </ScrollView>
  );
} 