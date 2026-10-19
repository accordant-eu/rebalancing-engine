export interface TradeExecutionEvent {
  brokerAccountId: string;
  orderId: string;
  instrumentId: string;
  status: string; // e.g., 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'
  filledQuantity?: number;
  filledPrice?: number;
  timestamp: string;
  reason?: string;
}

export interface BrokerStreamer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onTradeExecution(handler: (event: TradeExecutionEvent) => void): void;
  isConnected(): boolean;
}
