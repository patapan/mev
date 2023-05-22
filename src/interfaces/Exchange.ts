// The generic structure of a currency pair
interface CurrencyPair {
    base: string;
    quote: string;
  }
  
  // The generic structure of a ticker (price information)
  interface Ticker {
    pair: CurrencyPair;
    bid: number;
    ask: number;
    last: number;
    volume: number;
  }
  
  // The generic structure of an order
  interface Order {
    pair: CurrencyPair;
    type: 'buy' | 'sell';
    price: number;
    amount: number;
  }
  
  // The generic structure of a balance
  interface Balance {
    currency: string;
    amount: number;
  }
  
  interface CryptoExchange {
    getTicker(pair: CurrencyPair): Promise<Ticker>;
    getBalance(currency: string): Promise<Balance>;
    placeOrder(order: Order): Promise<Order>;
  }
  