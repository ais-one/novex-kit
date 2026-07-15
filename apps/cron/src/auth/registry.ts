import type { CronVerifier } from './types.ts';

const verifiers = new Map<string, CronVerifier>();

export function registerVerifier(name: string, verifier: CronVerifier): void {
  verifiers.set(name, verifier);
}

export function getVerifier(name: string): CronVerifier | undefined {
  return verifiers.get(name);
}
