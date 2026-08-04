/// <reference lib="webworker" />

import type { OptimizationRequest } from '../types';
import { optimizeBuild } from './StatOptimizer';
import { optimizeBuildV2 } from './BuildOptimizerV2';

let cancelled = false;

self.onmessage = (event: MessageEvent<{ type: 'optimize'; request: OptimizationRequest } | { type: 'cancel' }>) => {
  if (event.data.type === 'cancel') {
    cancelled = true;
    return;
  }
  cancelled = false;
  try {
    const optimizer = event.data.request.engine === 'v2' ? optimizeBuildV2 : optimizeBuild;
    const result = optimizer(event.data.request, {
      isCancelled: () => cancelled,
      onProgress: progress => self.postMessage({ type: 'progress', progress }),
    });
    if (!cancelled) self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Optimization failed.' });
  }
};

export {};
