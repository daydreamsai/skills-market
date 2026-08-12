export interface EvaluationResult {
  passed: boolean | null;
  score: number | null;
  lane: 'model' | 'recomputable';
  proofUrl?: string;
}

export interface EvaluatorBridgeConfig {
  baseUrl: string; // e.g. https://handsel-main.vercel.app or https://handsel-nu.vercel.app (Sepolia)
  authToken?: string;
}

export async function evaluateTaskWithHandsel(
  taskPayload: Record<string, unknown>,
  config: EvaluatorBridgeConfig
): Promise<EvaluationResult> {
  const { baseUrl, authToken } = config;

  if (!authToken) {
    return {
      passed: null,
      score: null,
      lane: 'model',
    };
  }

  try {
    const res = await fetch(`${baseUrl}/api/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(taskPayload),
    });

    if (!res.ok) {
      return {
        passed: null,
        score: null,
        lane: 'model',
      };
    }

    const data = await res.json();
    return {
      passed: typeof data.passed === 'boolean' ? data.passed : null,
      score: typeof data.score === 'number' ? data.score : null,
      lane: data.lane === 'recomputable' ? 'recomputable' : 'model',
      proofUrl: data.proofUrl,
    };
  } catch {
    return {
      passed: null,
      score: null,
      lane: 'model',
    };
  }
}
