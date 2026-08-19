import { REQUEST_ID_HEADER } from '@common/node/express/requestId';
import type { ContextLogger } from '@common/node/logging/context';
import { z } from 'zod';

// api.frankfurter.dev is a real, free, no-auth exchange-rate API — used as-is here so this
// repository is genuinely exercisable end to end, not just mocked. Swap `baseUrl` for a real
// provider's URL in production config; nothing else in this file needs to change.

const exchangeRateResponseSchema = z.object({
  amount: z.number(),
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
});

const { baseUrl = 'https://api.frankfurter.dev/v1' } = globalThis.__config?.EXCHANGE_RATE_CONFIG ?? {};

/**
 * Converts a USD cents amount to EUR cents. Returns `null` — never throws — if the provider
 * is unreachable or returns an unexpected shape: an enrichment failure must not fail order
 * creation. Forwards `log.context.requestId` on the outbound call so it's traceable back to
 * the request that triggered it, and validates the provider's response with zod before
 * trusting it — an external system can change shape without warning.
 */
export const convertUsdCentsToEurCents = async (usdCents: number, log: ContextLogger): Promise<number | null> => {
  try {
    const res = await fetch(`${baseUrl}/latest?base=USD&symbols=EUR`, {
      headers: { [REQUEST_ID_HEADER]: log.context.requestId },
    });
    if (!res.ok) throw new Error(`exchange rate API responded ${res.status}`);

    const parsed = exchangeRateResponseSchema.parse(await res.json());
    const rate = parsed.rates.EUR;
    if (typeof rate !== 'number') throw new Error('exchange rate response missing an EUR rate');

    return Math.round((usdCents / 100) * rate * 100);
  } catch (cause) {
    log.warn('exchange-rate lookup failed, order will have no EUR total', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return null;
  }
};
