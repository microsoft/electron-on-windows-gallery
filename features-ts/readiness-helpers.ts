// Reusable readiness-probe + EnsureReadyAsync wrapper for any Windows AI
// API class that exposes `getReadyState()` + `ensureReadyAsync(signal?)`.

import { AIFeatureReadyState, AIFeatureReadyResultState } from '#winapp/bindings';

interface WinRTAsyncWithProgress<T> extends Promise<T> {
  progress(cb: (value: number) => void): WinRTAsyncWithProgress<T>;
}

export interface ReadyableClass {
  getReadyState(): number;
  ensureReadyAsync(signal?: AbortSignal): WinRTAsyncWithProgress<{ status: number; errorDisplayText?: string }>;
}

export interface EnsureReadyResult {
  success: boolean;
  status: number;
  errorMessage?: string;
}

export interface ReadinessHelpers {
  getReadyState(): number;
  ensureReady(progressCallback?: (value: number) => void): Promise<EnsureReadyResult>;
  cancelEnsureReady(): boolean;
}

export function createReadinessHelpers(
  klass: ReadyableClass,
  featureName: string,
): ReadinessHelpers {
  let ensureReadyController: AbortController | null = null;

  function getReadyState(): number {
    try {
      return klass.getReadyState();
    } catch (error) {
      console.error(`[readiness:${featureName}] getReadyState failed:`, error);
      return AIFeatureReadyState.NotSupportedOnCurrentSystem;
    }
  }

  async function ensureReady(
    progressCallback?: (value: number) => void,
  ): Promise<EnsureReadyResult> {
    ensureReadyController?.abort(new Error('Superseded by new request'));
    const controller = new AbortController();
    ensureReadyController = controller;
    try {
      const op = klass.ensureReadyAsync(controller.signal);
      if (progressCallback) {
        op.progress((p) => {
          try { progressCallback(typeof p === 'number' ? p : Number(p)); } catch (e) {}
        });
      }
      const result = await op;
      const status = result.status;
      if (status === AIFeatureReadyResultState.Success) {
        return { success: true, status };
      }
      const msg = result.errorDisplayText || `Model install failed (status ${status})`;
      return { success: false, status, errorMessage: msg };
    } catch (error: any) {
      if (controller.signal.aborted) {
        return { success: false, status: AIFeatureReadyResultState.Failure, errorMessage: 'Canceled' };
      }
      const msg = error?.message || String(error);
      console.error(`[readiness:${featureName}] ensureReadyAsync failed:`, msg, error);
      return { success: false, status: AIFeatureReadyResultState.Failure, errorMessage: msg };
    } finally {
      if (ensureReadyController === controller) ensureReadyController = null;
    }
  }

  function cancelEnsureReady(): boolean {
    if (!ensureReadyController) return false;
    ensureReadyController.abort(new Error('User canceled model install'));
    return true;
  }

  return { getReadyState, ensureReady, cancelEnsureReady };
}
