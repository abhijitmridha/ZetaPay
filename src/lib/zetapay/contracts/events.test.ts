import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGetEventsRequest,
  mergeEventCursor,
  normalizeSorobanEvent,
  reconnectDelayMs,
} from './events';

test('buildGetEventsRequest creates a contract-scoped Soroban RPC filter', () => {
  const request = buildGetEventsRequest({
    contractIds: ['CA_PAYROLL', 'CA_POOL'],
    cursor: '123-4',
    limit: 25,
  });

  assert.equal(request.method, 'getEvents');
  assert.deepEqual(request.params.filters[0].contractIds, ['CA_PAYROLL', 'CA_POOL']);
  assert.equal(request.params.cursor, '123-4');
  assert.equal(request.params.pagination.limit, 25);
});

test('normalizeSorobanEvent maps known ZetaPay event topics', () => {
  const event = normalizeSorobanEvent(
    {
      id: 'evt-1',
      pagingToken: '456-1',
      contractId: 'CA_PAYROLL',
      topics: ['submit', 'CA_EMPLOYER', '1'],
    },
    0
  );

  assert.equal(event.kind, 'payroll_batch_submitted');
  assert.equal(event.cursor, '456-1');
  assert.equal(event.contractId, 'CA_PAYROLL');
});

test('reconnectDelayMs backs off with a production cap and cursor merge is stable', () => {
  assert.equal(reconnectDelayMs(0), 1000);
  assert.equal(reconnectDelayMs(3), 8000);
  assert.equal(reconnectDelayMs(99), 30000);

  assert.equal(mergeEventCursor('old', []), 'old');
  assert.equal(
    mergeEventCursor('old', [
      normalizeSorobanEvent({ id: 'a', pagingToken: 'cursor-a' }, 0),
      normalizeSorobanEvent({ id: 'b', pagingToken: 'cursor-b' }, 1),
    ]),
    'cursor-b'
  );
});
