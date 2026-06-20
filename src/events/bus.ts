import { EventEmitter } from 'events';

export type EventType = 
  | 'THRESHOLD_BREACH'
  | 'CIRCUIT_BREAKER_HALT'
  | 'REBALANCE_EXECUTED'
  | 'CIRCUIT_BREAKER_RESET';

export interface BaseEvent {
  type: EventType;
  accountId: string;
  timestamp: string;
  eventId: string;
}

export interface ThresholdBreachEvent extends BaseEvent {
  type: 'THRESHOLD_BREACH';
  trigger: any;
  auditRecord: any;
}

export interface CircuitBreakerHaltEvent extends BaseEvent {
  type: 'CIRCUIT_BREAKER_HALT';
  reason: string;
  grossNotional?: number;
  tradesCount?: number;
}

export interface RebalanceExecutedEvent extends BaseEvent {
  type: 'REBALANCE_EXECUTED';
  tradeProposal: any;
}

export interface CircuitBreakerResetEvent extends BaseEvent {
  type: 'CIRCUIT_BREAKER_RESET';
}

export type SystemEvent = 
  | ThresholdBreachEvent
  | CircuitBreakerHaltEvent
  | RebalanceExecutedEvent
  | CircuitBreakerResetEvent;

class EventBus extends EventEmitter {
  emitEvent(event: SystemEvent): boolean {
    return this.emit('system_event', event);
  }
}

export const systemEventBus = new EventBus();
