export interface TradeExecutionEvent {
  brokerAccountId: string;
  orderId: string;
  instrumentId: string;
  status: string; // e.g., 'FILLED', 'PARTIALLY_FILLED'
  filledQuantity?: number;
  filledPrice?: number;
  timestamp: string;
}

export interface BrokerStreamer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onTradeExecution(handler: (event: TradeExecutionEvent) => void): void;
}
