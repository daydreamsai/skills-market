import { ExternalEvaluatorBridge } from '../src/evaluators/ExternalEvaluatorBridge';

describe('ExternalEvaluatorBridge Unit Tests', () => {
  it('should initialize bridge and return valid evaluation structure', async () => {
    const bridge = new ExternalEvaluatorBridge();
    const result = await bridge.evaluateTask('task-1', 'sub-1', {});
    
    expect(result.taskId).toBe('task-1');
    expect(result.submissionId).toBe('sub-1');
    expect(result.passed).toBe(true);
    expect(result.proofUrl).toContain('handsel.dev/proof');
  });

  it('should throw error if taskId or submissionId missing', async () => {
    const bridge = new ExternalEvaluatorBridge();
    await expect(bridge.evaluateTask('', '', {})).rejects.toThrow();
  });
});
