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
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
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
    borderWidth: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  detailsContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 16,
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
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

          console.log('Chart data prepared:', chartData);
          setChartData(chartData);
        } else {
          console.warn('No valid chart data available');
          setChartData(null);
        }
      }

      // Fetch current stock data
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );

      console.log('Stock data response:', JSON.stringify(response.data, null, 2));

      if (!response.data.chart.result || response.data.chart.result.length === 0) {
        console.warn('No data found for symbol:', symbol);
        setError('No data available for this stock');
        return;
      }

      const stockData = response.data.chart.result[0];
      const meta = stockData.meta;
      const quote = stockData.indicators.quote[0];

      if (!meta || !quote) {
        console.warn('Invalid data structure for symbol:', symbol);
        setError('Invalid stock data received');
        return;
      }

      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      setStockData({
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        price: currentPrice?.toString() || '0.00',
        change: change?.toString() || '0.00',
        changePercent: changePercent?.toString() || '0.00',
        high: meta.regularMarketDayHigh?.toString() || '0.00',
        low: meta.regularMarketDayLow?.toString() || '0.00',
        volume: meta.regularMarketVolume?.toString() || '0',
        marketCap: meta.marketCap?.toString() || '0',
        peRatio: meta.trailingPE?.toString() || '0.00',
        eps: meta.epsTrailingTwelveMonths?.toString() || '0.00',
        dividendYield: meta.dividendYield?.toString() || '0.00'
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
        timeRange === range && { backgroundColor: theme.primary }
      ]}
      onPress={() => setTimeRange(range)}
    >
      <Text style={[
        styles.timeRangeButtonText,
        timeRange === range && { color: theme.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
        <Text style={[styles.symbol, { color: theme.text }]}>{stockData.symbol}</Text>
        <Text style={[styles.price, { color: theme.text }]}>
          ₹{parseFloat(stockData.price).toLocaleString('en-IN')}
        </Text>
        <Text
          style={[
            styles.change,
            parseFloat(stockData.change) >= 0
              ? { color: theme.success }
              : { color: theme.error }
          ]}
        >
          {parseFloat(stockData.change) >= 0 ? '+' : ''}
          {stockData.change} ({stockData.changePercent}%)
        </Text>
      </View>

      {chartData && (
        <View style={[styles.chartContainer, { 
          backgroundColor: theme.card,
          borderColor: theme.border 
        }]}>
          <View style={styles.timeRangeContainer}>
            <TimeRangeButton range="1d" label="1D" />
            <TimeRangeButton range="5d" label="5D" />
            <TimeRangeButton range="1mo" label="1M" />
            <TimeRangeButton range="3mo" label="3M" />
            <TimeRangeButton range="1y" label="1Y" />
          </View>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 2,
              color: (opacity = 1) => theme.text,
              labelColor: (opacity = 1) => theme.text,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: theme.primary
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      <View style={[styles.detailsContainer, { 
        backgroundColor: theme.card,
        borderColor: theme.border 
      }]}>
        <Text style={[styles.detailsTitle, { color: theme.text }]}>Stock Details</Text>
        <View style={styles.detailsRow}>
          <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Previous Close</Text>
          <Text style={[styles.detailsValue, { color: theme.text }]}>
            ₹{parseFloat(stockData.previousClose).toLocaleString('en-IN')}
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