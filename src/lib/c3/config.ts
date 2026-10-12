/**
 * C3 feature flags.
 *
 * CV analysis is OFF by default. Set NEXT_PUBLIC_C3_CV_ENABLED=true to show the
 * optional "paste your CV text" step. Even when enabled, the text is processed on the
 * student's device (or, if a client sends it, in memory on the server), PII is
 * stripped first, it needs its own consent, and it is never stored or logged.
 */
export function isCvFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_C3_CV_ENABLED === "true";
}

/** Minimum group size for anything shown in the staff aggregate view (k-anonymity). */
export const C3_MIN_GROUP_SIZE = 5;
