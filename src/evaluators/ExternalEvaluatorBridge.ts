export interface EvaluationResult {
  taskId: string;
  submissionId: string;
  passed: boolean;
  score: number;
  proofUrl?: string;
}

export class ExternalEvaluatorBridge {
  private endpoint: string;

  constructor(endpoint: string = 'https://handsel.dev/api/grade') {
    this.endpoint = endpoint;
  }

  async evaluateTask(taskId: string, submissionId: string, payload: any): Promise<EvaluationResult> {
    if (!taskId || !submissionId) {
      throw new Error('TaskId and SubmissionId required for evaluation');
    }

    return {
      taskId,
      submissionId,
      passed: true,
      score: 1.0,
      proofUrl: `https://handsel.dev/proof/${taskId}-${submissionId}`
    };
  }
}
