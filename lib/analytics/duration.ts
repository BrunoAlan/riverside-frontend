// Pure so it is unit-testable without a clock. Callers pass Date.now() values.
export function computeDurationSeconds(startMs: number, endMs: number): number {
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}
