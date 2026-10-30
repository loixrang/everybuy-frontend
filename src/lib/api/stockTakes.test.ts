import { afterEach, describe, expect, test } from 'bun:test';
import {
  cancelStockTake,
  createStockTake,
  fetchStockTake,
  fetchStockTakes,
  finalizeStockTake,
  recordStockTakeCount,
} from './stockTakes';

const originalFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  init?: RequestInit;
}

function mockJson(body: unknown, status = 200) {
  let captured: CapturedRequest | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { url: String(input), init };
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  return { request: () => captured };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('stocktake API', () => {
  test('creates a stocktake with only the name', async () => {
    const mock = mockJson({
      id: 'st-1',
      name: 'October stock count',
      status: 'Draft',
      reference: 'ST-20261030-ABC123',
      totalProducts: 7,
    });

    const created = await createStockTake({ name: 'October stock count' });

    expect(created.id).toBe('st-1');
    expect(created.totalProducts).toBe(7);

    const request = mock.request();
    expect(request?.url).toContain('/api/v1/stock-takes');
    expect(request?.init?.method).toBe('POST');
    expect(request?.init?.body).toBe('{"name":"October stock count"}');
  });

  test('requests one page of stocktakes and normalises a partial response', async () => {
    const mock = mockJson({ data: [{ id: 'st-1' }] });

    const page = await fetchStockTakes(2, 10);

    expect(page.page).toBe(2);
    expect(page.limit).toBe(10);
    expect(page.total).toBe(0);
    expect(page.data).toHaveLength(1);

    const request = mock.request();
    expect(request?.url).toContain('/api/v1/stock-takes?page=2&limit=10');
    expect(request?.init?.method).toBeUndefined();
  });

  test('treats a missing data array as an empty page', async () => {
    mockJson({ page: 1, limit: 20, total: 0 });
    const page = await fetchStockTakes();
    expect(page.data).toEqual([]);
  });

  test('fetches a stocktake with its items and derived totals', async () => {
    const mock = mockJson({
      id: 'st-1',
      status: 'Draft',
      items: [
        { id: 'i-1', countedPacks: 61 },
        { id: 'i-2', countedPacks: null },
      ],
    });

    const detail = await fetchStockTake('st-1');

    expect(detail.totalProducts).toBe(2);
    expect(detail.countedProducts).toBe(1);

    const request = mock.request();
    expect(request?.url).toContain('/api/v1/stock-takes/st-1');
  });

  test('prefers the backend count totals when present', async () => {
    mockJson({
      id: 'st-1',
      items: [{ id: 'i-1', countedPacks: 61 }],
      totalProducts: 9,
      countedProducts: 4,
    });

    const detail = await fetchStockTake('st-1');
    expect(detail.totalProducts).toBe(9);
    expect(detail.countedProducts).toBe(4);
  });

  test('records a count as a JSON number, not a string', async () => {
    const mock = mockJson({ id: 'i-1', countedPacks: 61 });

    await recordStockTakeCount('st-1', 'i-1', 61);

    const request = mock.request();
    expect(request?.url).toContain('/api/v1/stock-takes/st-1/items/i-1/count');
    expect(request?.init?.method).toBe('PATCH');
    expect(request?.init?.body).toBe('{"countedPacks":61}');

    const parsed = JSON.parse(String(request?.init?.body)) as {
      countedPacks: unknown;
    };
    expect(typeof parsed.countedPacks).toBe('number');
  });

  test('posts to finalize and cancel without a body', async () => {
    const finalizeMock = mockJson({ id: 'st-1', status: 'Finalized' });
    const finalized = await finalizeStockTake('st-1');
    expect(finalized.status).toBe('Finalized');
    expect(finalizeMock.request()?.url).toContain(
      '/api/v1/stock-takes/st-1/finalize',
    );
    expect(finalizeMock.request()?.init?.method).toBe('POST');
    expect(finalizeMock.request()?.init?.body).toBeUndefined();

    const cancelMock = mockJson({ id: 'st-2', status: 'Cancelled' });
    const cancelled = await cancelStockTake('st-2');
    expect(cancelled.status).toBe('Cancelled');
    expect(cancelMock.request()?.url).toContain(
      '/api/v1/stock-takes/st-2/cancel',
    );
    expect(cancelMock.request()?.init?.method).toBe('POST');
  });
});
