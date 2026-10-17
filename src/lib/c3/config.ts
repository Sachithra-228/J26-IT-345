/**
 * C3 feature flags.
 *
 * The optional "paste your CV text" step is shown by default. Set
 * NEXT_PUBLIC_C3_CV_ENABLED=false to hide it (and make the API refuse CV text). The
 * text is processed on the student's device (or, if a client sends it, in memory on
 * the server), PII is stripped first, it needs its own consent, and it is never
 * stored or logged. Until ethics approval, test it only with your own or synthetic CVs.
 */
export function isCvFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_C3_CV_ENABLED !== "false";
}

/** Minimum group size for anything shown in the staff aggregate view (k-anonymity). */
export const C3_MIN_GROUP_SIZE = 5;
