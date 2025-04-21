import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://query2.finance.yahoo.com/v8/finance/chart/';
const SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';

// Common Indian stocks for mock data
const COMMON_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' }
];

// Mock data for when API fails
const MOCK_STOCK_DATA = {
  'RELIANCE.NS': {
    currentPrice: 2500.00,
    change: 25.50,
    percentChange: 1.03,
    open: 2475.00,
    high: 2520.00,
    low: 2460.00,
    volume: 2500000
  },
  'TCS.NS': {
    currentPrice: 3500.00,
    change: -15.25,
    percentChange: -0.43,
    open: 3515.00,
    high: 3520.00,
    low: 3480.00,
    volume: 1500000
  },
  'HDFCBANK.NS': {
    currentPrice: 1600.00,
    change: 12.75,
    percentChange: 0.80,
    open: 1587.00,
    high: 1610.00,
    low: 1580.00,
    volume: 2000000
  }
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper function to delay API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Debounce function to limit API calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const searchStocks = async (query) => {
  try {
    console.log('Searching for:', query);
    
    // Try API search first
    const response = await axios.get(SEARCH_URL, {
      params: {
        q: query,
        quotesCount: 20,
        newsCount: 0,
        enableFuzzyQuery: true,
        quotesQueryId: 'tss_match_phrase_query',
        multiQuoteQueryId: 'multi_quote_single_token_query',
        enableCb: true,
        enableNavLinks: true,
        enableEnhancedTrivialQuery: true,
        enableResearchReports: true,
        enableCulturalAssets: true,
        researchReportsCount: 2
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    console.log('API search response:', response.data);

    if (response.data && response.data.quotes) {
      // Filter for Indian stocks and relevant matches
      const filteredStocks = response.data.quotes
        .filter(quote => {
          // Check if it's a valid stock
          const isValidStock = quote.quoteType === 'EQUITY';
          
          // Check if it matches the search query
          const matchesQuery = 
            (quote.symbol && quote.symbol.toLowerCase().includes(query.toLowerCase())) ||
            (quote.longname && quote.longname.toLowerCase().includes(query.toLowerCase())) ||
            (quote.shortname && quote.shortname.toLowerCase().includes(query.toLowerCase()));
          
          return isValidStock && matchesQuery;
        })
        .map(quote => {
          // Ensure proper symbol format for Indian stocks
          let symbol = quote.symbol;
          if (quote.exchange === 'NSI' && !symbol.endsWith('.NS')) {
            symbol = `${symbol}.NS`;
          } else if (quote.exchange === 'BSE' && !symbol.endsWith('.BO')) {
            symbol = `${symbol}.BO`;
          }

          return {
            symbol: symbol,
            name: quote.longname || quote.shortname || quote.symbol || 'Unknown',
            exchange: quote.exchange
          };
        });

      console.log('Filtered stocks:', filteredStocks);
      
      // Sort by relevance (exact matches first, then partial matches)
      const sortedStocks = filteredStocks.sort((a, b) => {
        const aExactMatch = a.symbol.toLowerCase() === query.toLowerCase() || 
                          a.name.toLowerCase() === query.toLowerCase();
        const bExactMatch = b.symbol.toLowerCase() === query.toLowerCase() || 
                          b.name.toLowerCase() === query.toLowerCase();
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        return 0;
      });

      // If we found stocks from API, return them
      if (sortedStocks.length > 0) {
        return sortedStocks;
      }
    }

    // Only if API search fails or returns no results, check common stocks
    const commonMatches = COMMON_STOCKS.filter(stock => 
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    );

    if (commonMatches.length > 0) {
      console.log('Found in common stocks:', commonMatches);
      return commonMatches;
    }

    return [];
  } catch (error) {
    console.error('Error in searchStocks:', error);
    // If API fails, try common stocks
    const commonMatches = COMMON_STOCKS.filter(stock => 
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    );
    return commonMatches;
  }
};

export const getStockQuote = async (symbol) => {
  try {
    console.log('🔄 Fetching quote for:', symbol);

    const response = await axios.get(`${BASE_URL}${symbol}`, {
      params: { interval: '1d', range: '1d' },
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });

    // 1️⃣ Dump the full response so we see everything
    console.log(
      `📦 Full raw response for ${symbol}:`,
      JSON.stringify(response.data, null, 2)
    );

    const result = response.data.chart?.result?.[0];
    if (!result) {
      console.warn(`⚠️ No chart.result[0] for ${symbol}`);
      return null;
    }

    const { meta, indicators } = result;
    const quote = indicators.quote?.[0];
    if (!meta || !quote) {
      console.warn(`⚠️ Missing meta or quote block for ${symbol}`);
      return null;
    }

    // 2️⃣ Dump meta so we see exactly which keys exist
    console.log(
      `🧠 Full meta for ${symbol}:`,
      JSON.stringify(meta, null, 2)
    );
    console.log(`🧠 quote.close for ${symbol}:`, quote.close);

    // 3️⃣ Extract fields with fallback
    const currentPrice  = meta.regularMarketPrice;
    const rawPrevClose  = meta.chartPreviousClose;
    const previousClose =
      typeof rawPrevClose === 'number'
        ? rawPrevClose
        : quote.close?.[0];

    const open    = quote.open?.[0];
    const high    = quote.high?.[0];
    const low     = quote.low?.[0];
    const volume  = quote.volume?.[0];

    console.log(
      `📌 Values → currentPrice: ${currentPrice}, previousClose: ${previousClose}`
    );

    // 4️⃣ Only calculate if both are valid numbers
    if (
      typeof currentPrice === 'number' &&
      typeof previousClose === 'number' &&
      !isNaN(currentPrice) &&
      !isNaN(previousClose)
    ) {
      const change        = currentPrice - previousClose;
      const percentChange = (change / previousClose) * 100;

      console.log(
        `📊 Parsed for ${symbol} → Price: ${currentPrice}, ` +
        `prev close: ${previousClose}`+
        `Change: ${change.toFixed(2)}, % Change: ${percentChange.toFixed(2)}%`
      );

      return { currentPrice, change, percentChange, open, high, low, volume };
    }

    console.warn(`⚠️ Invalid numbers for ${symbol}`, {
      currentPrice,
      previousClose,
    });
    return {
      currentPrice,
      change: 'N/A',
      percentChange: 'N/A',
      open,
      high,
      low,
      volume,
    };

  } catch (error) {
    console.error('❌ Error in getStockQuote:', error);
    return null;
  }
};

export const getStockDetails = async (symbol) => {
  try {
    // Add .BSE suffix for Indian stocks if not present
    const formattedSymbol = symbol.endsWith('.BSE') ? symbol : `${symbol}.BSE`;
    
    const response = await axios.get(API_CONFIG.BASE_URL, {
      params: {
        function: API_CONFIG.TIME_SERIES_DAILY,
        symbol: formattedSymbol,
        apikey: API_CONFIG.API_KEY,
      },
    });

    if (response.data['Time Series (Daily)']) {
      const timeSeries = response.data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries);
      const latest = timeSeries[dates[0]];
      const previous = timeSeries[dates[1]];

      return {
        symbol: symbol,
        currentPrice: parseFloat(latest['4. close']),
        open: parseFloat(latest['1. open']),
        high: parseFloat(latest['2. high']),
        low: parseFloat(latest['3. low']),
        volume: parseInt(latest['5. volume']),
        previousClose: parseFloat(previous['4. close']),
        change: parseFloat(latest['4. close']) - parseFloat(previous['4. close']),
        changePercent: ((parseFloat(latest['4. close']) - parseFloat(previous['4. close'])) / parseFloat(previous['4. close'])) * 100,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return null;
  }
}; 