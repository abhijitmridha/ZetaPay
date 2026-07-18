export type ZetaPayEventKind =
  | 'payroll_initialized'
  | 'payroll_batch_submitted'
  | 'payroll_batch_executed'
  | 'pool_initialized'
  | 'token_registered'
  | 'root_accepted'
  | 'note_deposited'
  | 'note_withdrawn'
  | 'unknown';

export type SorobanEventFilterInput = {
  contractIds: string[];
  cursor?: string;
  limit?: number;
};

export type SorobanRpcEvent = {
  id?: string;
  pagingToken?: string;
  contractId?: string;
  topic?: unknown[];
  topics?: unknown[];
  value?: unknown;
};

export type ZetaPayEvent = {
  id: string;
  cursor: string;
  contractId: string;
  kind: ZetaPayEventKind;
  raw: SorobanRpcEvent;
};

const EVENT_KIND_BY_TOPIC = new Map<string, ZetaPayEventKind>([
  ['init', 'payroll_initialized'],
  ['submit', 'payroll_batch_submitted'],
  ['execute', 'payroll_batch_executed'],
  ['token', 'token_registered'],
  ['root', 'root_accepted'],
  ['deposit', 'note_deposited'],
  ['withdraw', 'note_withdrawn'],
]);

export function buildGetEventsRequest(input: SorobanEventFilterInput) {
  if (!input.contractIds.length) {
    throw new Error('At least one contract id is required to subscribe to ZetaPay events.');
  }

  return {
    jsonrpc: '2.0',
    id: 'zetapay-events',
    method: 'getEvents',
    params: {
      startLedger: input.cursor ? undefined : 'latest',
      cursor: input.cursor,
      pagination: { limit: input.limit ?? 50 },
      filters: [
        {
          type: 'contract',
          contractIds: input.contractIds,
        },
      ],
    },
  };
}

export function reconnectDelayMs(attempt: number) {
  const boundedAttempt = Math.max(0, Math.min(attempt, 6));
  return Math.min(30_000, 1_000 * 2 ** boundedAttempt);
}

export function normalizeEventKind(event: SorobanRpcEvent): ZetaPayEventKind {
  const topics = event.topics ?? event.topic ?? [];
  const firstTopic = String(topics[0] ?? '').replace(/^Symbol\((.*)\)$/, '$1');

  return EVENT_KIND_BY_TOPIC.get(firstTopic) ?? 'unknown';
}

export function normalizeSorobanEvent(event: SorobanRpcEvent, fallbackIndex: number): ZetaPayEvent {
  const cursor = event.pagingToken ?? event.id ?? String(fallbackIndex);

  return {
    id: event.id ?? cursor,
    cursor,
    contractId: event.contractId ?? '',
    kind: normalizeEventKind(event),
    raw: event,
  };
}

export function mergeEventCursor(currentCursor: string | undefined, events: ZetaPayEvent[]) {
  return events.length ? events[events.length - 1].cursor : currentCursor;
}
