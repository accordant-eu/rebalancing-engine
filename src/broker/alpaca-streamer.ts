import WebSocket from 'ws';
import { BrokerStreamer, TradeExecutionEvent } from './streamer';
import { logger } from '../utils/logger';

export class AlpacaBrokerStreamer implements BrokerStreamer {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private apiSecret: string;
  private isConnected: boolean = false;
  private baseUrl: string;
  private handlers: Array<(event: TradeExecutionEvent) => void> = [];
  
  constructor(apiKey: string, apiSecret: string, isPaper: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = isPaper ? 'wss://stream.data.alpaca.markets/v2/test' : 'wss://stream.data.alpaca.markets/v2/stream';
    // Actually for trade updates it's paper-api.alpaca.markets/stream
    this.baseUrl = isPaper ? 'wss://paper-api.alpaca.markets/stream' : 'wss://api.alpaca.markets/stream';
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) return resolve();

      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        logger.info(`[AlpacaStreamer] Connected to ${this.baseUrl}`);
        // Send authentication
        const authMsg = {
          action: 'auth',
          key: this.apiKey,
          secret: this.apiSecret
        };
        this.ws?.send(JSON.stringify(authMsg));
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.stream === 'authorization') {
          if (msg.data.status === 'authorized') {
            logger.info('[AlpacaStreamer] Authenticated successfully.');
            // Subscribe to trade updates
            this.ws?.send(JSON.stringify({
              action: 'listen',
              data: {
                streams: ['trade_updates']
              }
            }));
            this.isConnected = true;
            resolve();
          } else {
            logger.error('[AlpacaStreamer] Authentication failed.');
            reject(new Error('Alpaca WebSocket Authentication failed'));
          }
        } else if (msg.stream === 'trade_updates') {
          this.handleTradeUpdate(msg.data);
        } else if (msg.stream === 'listening') {
          logger.info(`[AlpacaStreamer] Listening to streams: ${msg.data.streams}`);
        }
      });

      this.ws.on('error', (err) => {
        logger.error({ err }, '[AlpacaStreamer] WebSocket error');
      });

      this.ws.on('close', () => {
        logger.warn('[AlpacaStreamer] WebSocket closed');
        this.isConnected = false;
        // In a real app we'd want automatic reconnection logic here
      });
    });
  }

  public async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }

  public onTradeExecution(handler: (event: TradeExecutionEvent) => void): void {
    this.handlers.push(handler);
  }

  private handleTradeUpdate(data: any) {
    const { event, execution_id, order } = data;
    
    // We only care about fill events
    if (event === 'fill' || event === 'partial_fill') {
      const execEvent: TradeExecutionEvent = {
        brokerAccountId: 'alpaca', // Assuming 1:1 map for MVP
        orderId: order.client_order_id || order.id,
        instrumentId: order.symbol,
        status: event === 'fill' ? 'FILLED' : 'PARTIALLY_FILLED',
        filledQuantity: parseFloat(data.qty),
        filledPrice: parseFloat(data.price),
        timestamp: data.timestamp
      };
      
      this.handlers.forEach(h => h(execEvent));
    }
  }
}
