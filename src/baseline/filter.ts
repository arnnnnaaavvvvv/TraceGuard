import type { Finding, BaselineFile } from '../types/core.js';

export function filterFindingsWithBaseline(
  findings: readonly Finding[],
  baseline?: BaselineFile
): readonly Finding[] {
  if (!baseline || baseline.entries.length === 0) {
    return findings;
  }

  const baselineFingerprints = new Set(baseline.entries.map((e) => e.fingerprint));

  return findings.map((f) => {
    if (baselineFingerprints.has(f.id)) {
      return {
        ...f,
        suppressed: true,
      };
    }
    return f;
  });
}
