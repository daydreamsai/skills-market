import { evaluateTaskWithHandsel } from './external-evaluator-bridge';

describe('Handsel External Evaluator Bridge', () => {
  const sepoliaConfig = {
    baseUrl: 'https://handsel-nu.vercel.app',
    authToken: 'test-bearer-token',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should return passed: null when authToken is missing', async () => {
    const res = await evaluateTaskWithHandsel({}, { baseUrl: 'https://handsel-nu.vercel.app' });
    expect(res).toEqual({ passed: null, score: null, lane: 'model' });
  });

  it('should call POST /api/grade with correct Bearer token header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passed: true, score: 0.95, lane: 'model', proofUrl: 'https://handsel-nu.vercel.app/proof/1' }),
    });

    const res = await evaluateTaskWithHandsel({ deliverable: 'test' }, sepoliaConfig);

    expect(global.fetch).toHaveBeenCalledWith('https://handsel-nu.vercel.app/api/grade', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-bearer-token',
      },
    }));
    expect(res.passed).toBe(true);
    expect(res.score).toBe(0.95);
  });

  it('should return passed: false when grader rejects submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passed: false, score: 0.2, lane: 'model' }),
    });

    const res = await evaluateTaskWithHandsel({ deliverable: 'bad' }, sepoliaConfig);
    expect(res.passed).toBe(false);
  });

  it('should return passed: null when HTTP response is 401 Unauthorized', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
    const res = await evaluateTaskWithHandsel({}, sepoliaConfig);
    expect(res.passed).toBeNull();
  });

  it('should return passed: null on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const res = await evaluateTaskWithHandsel({}, sepoliaConfig);
    expect(res.passed).toBeNull();
  });
});
