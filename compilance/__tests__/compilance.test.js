const { canCall } = require('../compilance.service');
const pool = require('../../db/queries');
const { getDDDTimezone } = require('../ddd-timezone.map');

jest.mock('../../db/queries');
jest.mock('../ddd-timezone.map');

describe('canCall()', () => {
  let client;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool.connect.mockResolvedValue(client);
    getDDDTimezone.mockReturnValue('America/Sao_Paulo');

    process.env.MAX_ATTEMPTS_PER_24H = '4';
    process.env.COST_CAP_PER_LEAD_BRL = '10';
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  function mockTime(hour, weekday = 'seg') {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      formatToParts: () => ([
        { type: 'hour', value: String(hour) },
        { type: 'weekday', value: weekday }
      ])
    }));
  }

  test('sem consentimento → NO_CONSENT', async () => {
    mockTime(10, 'seg');

    client.query
      .mockResolvedValueOnce({})          // SET search_path
      .mockResolvedValueOnce({ rows: [] });// consent

    const res = await canCall(1, '11 99999-9999', 'tenant1');

    expect(res.allowed).toBe(false);
    expect(res.reasons).toContain('NO_CONSENT');
  });

  test('número na DNC → DNC_BLOCKED', async () => {
    mockTime(10, 'seg');

    client.query
      .mockResolvedValueOnce({})                  // SET search_path
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // consent OK
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // DNC

    const res = await canCall(1, '11 99999-9999', 'tenant1');

    expect(res.allowed).toBe(false);
    expect(res.reasons).toContain('DNC_BLOCKED');
  });

  test('fora do horário permitido → OUTSIDE_HOURS', async () => {
    mockTime(22, 'seg');

    client.query
      .mockResolvedValueOnce({})                   // SET search_path
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // consent
      .mockResolvedValueOnce({ rows: [] });        // DNC

    const res = await canCall(1, '11 99999-9999', 'tenant1');

    expect(res.allowed).toBe(false);
    expect(res.reasons).toContain('OUTSIDE_HOURS');
    expect(res.localHour).toBe(22);
  });

  test('excedeu tentativas 24h → MAX_ATTEMPTS', async () => {
    mockTime(10, 'seg');

    client.query
      .mockResolvedValueOnce({})                   // SET search_path
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // consent
      .mockResolvedValueOnce({ rows: [] })          // DNC
      .mockResolvedValueOnce({ rows: [{ count: '4' }] }); // tentativas

    const res = await canCall(1, '11 99999-9999', 'tenant1');

    expect(res.allowed).toBe(false);
    expect(res.reasons).toContain('MAX_ATTEMPTS');
  });

  test('tudo ok → allowed = true', async () => {
    mockTime(10, 'seg');

    client.query
      .mockResolvedValueOnce({})                    // SET search_path
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // consent
      .mockResolvedValueOnce({ rows: [] })           // DNC
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // tentativas
      .mockResolvedValueOnce({ rows: [{ total: '3.5' }] }); // custo

    const res = await canCall(1, '11 99999-9999', 'tenant1');

    expect(res.allowed).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });
});