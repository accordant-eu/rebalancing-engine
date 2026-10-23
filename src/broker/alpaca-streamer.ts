import WebSocket from 'ws';
import { BrokerStreamer, TradeExecutionEvent } from './streamer';
import { logger } from '../utils/logger';

export class AlpacaBrokerStreamer implements BrokerStreamer {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private apiSecret: string;
  private isConnectedState: boolean = false;
  private baseUrl: string;
  private handlers: Array<(event: TradeExecutionEvent) => void> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect: boolean = false;
  private autoReconnect: boolean = true;
  
  constructor(apiKey: string, apiSecret: string, isPaper: boolean = true, autoReconnect: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.autoReconnect = autoReconnect;
    // For trade updates stream
    this.baseUrl = isPaper ? 'wss://paper-api.alpaca.markets/stream' : 'wss://api.alpaca.markets/stream';
  }

  public isConnected(): boolean {
    return this.isConnectedState;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnectedState) return resolve();
      this.isExplicitDisconnect = false;

      try {
        this.ws = new WebSocket(this.baseUrl);
      } catch (err) {
        return reject(err);
      }

      let hasResolved = false;

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
        try {
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
              this.isConnectedState = true;
              this.reconnectAttempts = 0;
              if (!hasResolved) {
                hasResolved = true;
                resolve();
              }
            } else {
              logger.error('[AlpacaStreamer] Authentication failed.');
              if (!hasResolved) {
                hasResolved = true;
                reject(new Error('Alpaca WebSocket Authentication failed'));
              }
            }
          } else if (msg.stream === 'trade_updates') {
            this.handleTradeUpdate(msg.data);
          } else if (msg.stream === 'listening') {
            logger.info(`[AlpacaStreamer] Listening to streams: ${msg.data.streams}`);
          }
        } catch (parseErr) {
          logger.error({ parseErr }, '[AlpacaStreamer] Error parsing WebSocket message');
        }
      });

      this.ws.on('error', (err) => {
        logger.error({ err }, '[AlpacaStreamer] WebSocket error');
        if (!hasResolved && !this.isConnectedState) {
          hasResolved = true;
          reject(err);
        }
      });

      this.ws.on('close', () => {
        logger.warn('[AlpacaStreamer] WebSocket closed');
        this.isConnectedState = false;
        if (!this.isExplicitDisconnect && this.autoReconnect) {
          this.scheduleReconnect();
        }
      });
    });
  }

  public async disconnect(): Promise<void> {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnectedState = false;
    }
  }

  public onTradeExecution(handler: (event: TradeExecutionEvent) => void): void {
    this.handlers.push(handler);
  }

  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect || this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`[AlpacaStreamer] Reached maximum reconnect attempts (${this.maxReconnectAttempts})`);
      return;
    }

    const delay = Math.min(30000, 500 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    logger.info(`[AlpacaStreamer] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        logger.info('[AlpacaStreamer] Reconnected successfully');
      } catch (err) {
        logger.warn({ err }, '[AlpacaStreamer] Reconnect attempt failed');
        this.scheduleReconnect();
      }
    }, delay);
  }

  private handleTradeUpdate(data: any) {
    if (!data) return;
    const { event, order } = data;
    if (!order) return;

    let status: string;
    let filledQuantity: number;
    let filledPrice: number;

    switch (event) {
      case 'fill':
        status = 'FILLED';
        filledQuantity = parseFloat(order.filled_qty || data.qty || '0');
        filledPrice = parseFloat(data.price || order.filled_avg_price || '0');
        break;
      case 'partial_fill':
        status = 'PARTIALLY_FILLED';
        filledQuantity = parseFloat(order.filled_qty || data.qty || '0');
        filledPrice = parseFloat(data.price || order.filled_avg_price || '0');
        break;
      case 'canceled':
        status = 'CANCELED';
        filledQuantity = parseFloat(order.filled_qty || '0');
        filledPrice = parseFloat(order.filled_avg_price || '0');
        break;
      case 'rejected':
        status = 'REJECTED';
        filledQuantity = parseFloat(order.filled_qty || '0');
        filledPrice = parseFloat(order.filled_avg_price || '0');
        break;
      case 'expired':
        status = 'EXPIRED';
        filledQuantity = parseFloat(order.filled_qty || '0');
        filledPrice = parseFloat(order.filled_avg_price || '0');
        break;
      case 'order_cancel_rejected':
        status = 'CANCEL_REJECTED';
        filledQuantity = parseFloat(order.filled_qty || '0');
        filledPrice = parseFloat(order.filled_avg_price || '0');
        break;
      case 'new':
      case 'pending_new':
        status = 'PENDING';
        filledQuantity = 0;
        filledPrice = 0;
        break;
      default:
        logger.debug({ event }, '[AlpacaStreamer] Unhandled trade update event');
        return;
    }

    const execEvent: TradeExecutionEvent = {
      brokerAccountId: 'alpaca',
      orderId: order.client_order_id || order.id,
      instrumentId: order.symbol,
      status,
      filledQuantity,
      filledPrice,
      timestamp: data.timestamp || order.updated_at || order.created_at || new Date().toISOString(),
      reason: data.reason || undefined,
    };

    for (const handler of this.handlers) {
      try {
        handler(execEvent);
      } catch (err) {
        logger.error({ err, orderId: execEvent.orderId }, '[AlpacaStreamer] Error in trade execution handler');
      }
    }
  }
}
