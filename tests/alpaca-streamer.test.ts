import { AlpacaBrokerStreamer } from '../src/broker/alpaca-streamer';
import WebSocket from 'ws';
import { logger } from '../src/utils/logger';

// Mock ws
jest.mock('ws');

describe('AlpacaBrokerStreamer', () => {
  let streamer: AlpacaBrokerStreamer;
  let mockWsInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock WebSocket instance
    mockWsInstance = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
    };
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWsInstance);

    streamer = new AlpacaBrokerStreamer('TEST_KEY', 'TEST_SECRET', true);
  });

  afterEach(async () => {
    await streamer.disconnect();
  });

  it('connects and authenticates successfully', async () => {
    const connectPromise = streamer.connect();
    
    // Simulate open event
    const onOpen = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'open')[1];
    onOpen();
    
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({
      action: 'auth',
      key: 'TEST_KEY',
      secret: 'TEST_SECRET'
    }));

    // Simulate auth success message
    const onMessage = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'message')[1];
    onMessage(Buffer.from(JSON.stringify({
      stream: 'authorization',
      data: { status: 'authorized' }
    })));

    await connectPromise;

    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({
      action: 'listen',
      data: { streams: ['trade_updates'] }
    }));
  });

  it('rejects on authentication failure', async () => {
    const connectPromise = streamer.connect();
    
    const onOpen = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'open')[1];
    onOpen();

    const onMessage = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'message')[1];
    onMessage(Buffer.from(JSON.stringify({
      stream: 'authorization',
      data: { status: 'unauthorized' }
    })));

    await expect(connectPromise).rejects.toThrow('Alpaca WebSocket Authentication failed');
  });

  it('emits trade execution event on fill', async () => {
    const onOpen = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'open');
    // If not connected yet, we need to connect
    const connectPromise = streamer.connect();
    mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'open')[1]();
    mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'message')[1](Buffer.from(JSON.stringify({
      stream: 'authorization',
      data: { status: 'authorized' }
    })));
    await connectPromise;

    const handler = jest.fn();
    streamer.onTradeExecution(handler);

    const onMessage = mockWsInstance.on.mock.calls.find((c: any) => c[0] === 'message')[1];
    
    // Simulate trade update
    onMessage(Buffer.from(JSON.stringify({
      stream: 'trade_updates',
      data: {
        event: 'fill',
        execution_id: 'exec-123',
        order: {
          client_order_id: 'order-123',
          symbol: 'AAPL'
        },
        qty: '10.5',
        price: '150.25',
        timestamp: '2026-08-01T10:00:00Z'
      }
    })));

    expect(handler).toHaveBeenCalledWith({
      brokerAccountId: 'alpaca',
      orderId: 'order-123',
      instrumentId: 'AAPL',
      status: 'FILLED',
      filledQuantity: 10.5,
      filledPrice: 150.25,
      timestamp: '2026-08-01T10:00:00Z'
    });
  });
});
