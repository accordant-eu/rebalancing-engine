import { EventEmitter } from 'events';

export type EventType = 
  | 'THRESHOLD_BREACH'
  | 'CIRCUIT_BREAKER_HALT'
  | 'REBALANCE_EXECUTED'
  | 'CIRCUIT_BREAKER_RESET'
  | 'BATCH_EVALUATION_PROGRESS'
  | 'MANDATE_SCHEDULE_EVALUATED';

export interface BaseEvent {
  type: EventType;
  accountId?: string;
  tenantId?: string;
  timestamp: string;
  eventId?: string;
}

export interface ThresholdBreachEvent extends BaseEvent {
  type: 'THRESHOLD_BREACH';
  accountId: string;
  eventId: string;
  trigger: any;
  auditRecord: any;
}

export interface CircuitBreakerHaltEvent extends BaseEvent {
  type: 'CIRCUIT_BREAKER_HALT';
  accountId: string;
  eventId: string;
  reason: string;
  grossNotional?: number;
  tradesCount?: number;
}

export interface RebalanceExecutedEvent extends BaseEvent {
  type: 'REBALANCE_EXECUTED';
  accountId: string;
  eventId: string;
  tradeProposal: any;
}

export interface CircuitBreakerResetEvent extends BaseEvent {
  type: 'CIRCUIT_BREAKER_RESET';
  accountId: string;
  eventId: string;
}

export interface BatchEvaluationProgressEvent extends BaseEvent {
  type: 'BATCH_EVALUATION_PROGRESS';
  data: {
    batchSize: number;
    successes: number;
    failures: number;
    tradesGenerated: number;
    remainingQueueDepth: number;
  };
}

export interface MandateScheduleEvaluatedEvent extends BaseEvent {
  type: 'MANDATE_SCHEDULE_EVALUATED';
  data: {
    evaluationDate: string;
    scanned: number;
    enqueued: number;
    accountIds: string[];
  };
}

export type SystemEvent = 
  | ThresholdBreachEvent
  | CircuitBreakerHaltEvent
  | RebalanceExecutedEvent
  | CircuitBreakerResetEvent
  | BatchEvaluationProgressEvent
  | MandateScheduleEvaluatedEvent;

class EventBus extends EventEmitter {
  emitEvent(event: SystemEvent): boolean {
    return this.emit('system_event', event);
  }

  publish(event: SystemEvent): boolean {
    return this.emit('system_event', event);
  }
}

export const systemEventBus = new EventBus();
