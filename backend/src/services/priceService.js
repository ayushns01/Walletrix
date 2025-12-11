import axios from 'axios';

/**
 * Price Service
 * Fetches cryptocurrency prices and market data from CoinGecko
 */

class PriceService {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    
    // Popular crypto IDs on CoinGecko
    this.cryptoIds = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      USDT: 'tether',
      USDC: 'usd-coin',
      BNB: 'binancecoin',
      DAI: 'dai',
      LINK: 'chainlink',
      UNI: 'uniswap',
      WBTC: 'wrapped-bitcoin',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2',
      SOL: 'solana',
      ARB: 'arbitrum',
      OP: 'optimism',
      BASE: 'base',
    };
  }

  /**
   * Get current price for a cryptocurrency
   * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
   * @param {string} vsCurrency - Fiat currency (default: 'usd')
   */
  async getPrice(coinId, vsCurrency = 'usd') {
    try {
      const url = `${this.baseUrl}/simple/price`;
      const response = await axios.get(url, {
        params: {
          ids: coinId,
          vs_currencies: vsCurrency,
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true,
          include_last_updated_at: true,
        },
      });

      const data = response.data[coinId];
      
      if (!data) {
        throw new Error('Cryptocurrency not found');
      }

      return {
        success: true,
        coin: coinId,
        price: data[vsCurrency],
        currency: vsCurrency.toUpperCase(),
        marketCap: data[`${vsCurrency}_market_cap`],
        volume24h: data[`${vsCurrency}_24h_vol`],
        change24h: data[`${vsCurrency}_24h_change`],
        lastUpdated: new Date(data.last_updated_at * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Error getting price:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get prices for multiple cryptocurrencies
   * Handles large requests by chunking if needed
   */
  async getMultiplePrices(coinIds, vsCurrency = 'usd') {
    try {
      const coinsArray = Array.isArray(coinIds) ? coinIds : [coinIds];
      const chunkSize = 50; // CoinGecko allows up to 50-100 coins per request
      
      // If request is small enough, make single request
      if (coinsArray.length <= chunkSize) {
        const url = `${this.baseUrl}/simple/price`;
        const response = await axios.get(url, {
          params: {
            ids: coinsArray.join(','),
            vs_currencies: vsCurrency,
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true,
          },
        });

        const prices = Object.entries(response.data).map(([coin, data]) => ({
          coin,
          price: data[vsCurrency],
          currency: vsCurrency.toUpperCase(),
          marketCap: data[`${vsCurrency}_market_cap`],
          volume24h: data[`${vsCurrency}_24h_vol`],
          change24h: data[`${vsCurrency}_24h_change`],
        }));

        return {
          success: true,
          prices,
        };
      }
      
      // For larger requests, chunk them
      const allPrices = [];
      for (let i = 0; i < coinsArray.length; i += chunkSize) {
        const chunk = coinsArray.slice(i, i + chunkSize);
        const url = `${this.baseUrl}/simple/price`;
        
        const response = await axios.get(url, {
          params: {
            ids: chunk.join(','),
            vs_currencies: vsCurrency,
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true,
          },
        });

        const prices = Object.entries(response.data).map(([coin, data]) => ({
          coin,
          price: data[vsCurrency],
          currency: vsCurrency.toUpperCase(),
          marketCap: data[`${vsCurrency}_market_cap`],
          volume24h: data[`${vsCurrency}_24h_vol`],
          change24h: data[`${vsCurrency}_24h_change`],
        }));

        allPrices.push(...prices);
        
        // Add small delay between chunks to avoid rate limiting
        if (i + chunkSize < coinsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        prices: allPrices,
      };
    } catch (error) {
      console.error('Error getting multiple prices:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get popular crypto prices
   */
  async getPopularPrices(vsCurrency = 'usd') {
    try {
      const coinIds = Object.values(this.cryptoIds);
      return await this.getMultiplePrices(coinIds, vsCurrency);
    } catch (error) {
      console.error('Error getting popular prices:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get detailed coin data
   */
  async getCoinData(coinId) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}`;
      const response = await axios.get(url, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
        },
      });

      const coin = response.data;
      const marketData = coin.market_data;

      return {
        success: true,
        coin: {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image?.large,
          currentPrice: marketData.current_price,
          marketCap: marketData.market_cap,
          marketCapRank: coin.market_cap_rank,
          totalVolume: marketData.total_volume,
          high24h: marketData.high_24h,
          low24h: marketData.low_24h,
          priceChange24h: marketData.price_change_24h,
          priceChangePercentage24h: marketData.price_change_percentage_24h,
          priceChangePercentage7d: marketData.price_change_percentage_7d,
          priceChangePercentage30d: marketData.price_change_percentage_30d,
          circulatingSupply: marketData.circulating_supply,
          totalSupply: marketData.total_supply,
          maxSupply: marketData.max_supply,
          ath: marketData.ath,
          athDate: marketData.ath_date,
          atl: marketData.atl,
          atlDate: marketData.atl_date,
        },
      };
    } catch (error) {
      console.error('Error getting coin data:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get price chart data (historical prices)
   */
  async getPriceChart(coinId, vsCurrency = 'usd', days = 7) {
    try {
      const url = `${this.baseUrl}/coins/${coinId}/market_chart`;
      const response = await axios.get(url, {
        params: {
          vs_currency: vsCurrency,
          days,
          interval: days <= 1 ? 'hourly' : 'daily',
        },
      });

      const prices = response.data.prices.map(([timestamp, price]) => ({
        timestamp: new Date(timestamp).toISOString(),
        price,
      }));

      return {
        success: true,
        coin: coinId,
        currency: vsCurrency.toUpperCase(),
        days,
        data: prices,
      };
    } catch (error) {
      console.error('Error getting price chart:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Search for cryptocurrencies
   */
  async searchCoins(query) {
    try {
      const url = `${this.baseUrl}/search`;
      const response = await axios.get(url, {
        params: { query },
      });

      const coins = response.data.coins.slice(0, 10).map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        marketCapRank: coin.market_cap_rank,
        thumb: coin.thumb,
      }));

      return {
        success: true,
        query,
        coins,
      };
    } catch (error) {
      console.error('Error searching coins:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get trending coins
   */
  async getTrendingCoins() {
    try {
      const url = `${this.baseUrl}/search/trending`;
      const response = await axios.get(url);

      const trending = response.data.coins.map(item => ({
        id: item.item.id,
        name: item.item.name,
        symbol: item.item.symbol,
        marketCapRank: item.item.market_cap_rank,
        thumb: item.item.thumb,
        score: item.item.score,
      }));

      return {
        success: true,
        trending,
      };
    } catch (error) {
      console.error('Error getting trending coins:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get top coins by market cap
   */
  async getTopCoins(vsCurrency = 'usd', limit = 10) {
    try {
      const url = `${this.baseUrl}/coins/markets`;
      const response = await axios.get(url, {
        params: {
          vs_currency: vsCurrency,
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d',
        },
      });

      const coins = response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        totalVolume: coin.total_volume,
        priceChange24h: coin.price_change_percentage_24h,
        priceChange7d: coin.price_change_percentage_7d_in_currency,
      }));

      return {
        success: true,
        currency: vsCurrency.toUpperCase(),
        coins,
      };
    } catch (error) {
      console.error('Error getting top coins:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies() {
    return {
      success: true,
      currencies: ['usd', 'eur', 'gbp', 'jpy', 'cny', 'krw', 'inr', 'cad', 'aud'],
    };
  }

  /**
   * Get popular crypto IDs
   */
  getPopularCryptoIds() {
    return {
      success: true,
      cryptos: this.cryptoIds,
    };
  }
}

export default new PriceService();
