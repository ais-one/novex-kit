// scripts/generators/lib/args.ts
//
// Shared by generate-crud.ts and generate-openapi.ts.

/**
 * Parses a flat `--key value` argument list into a plain object.
 * Consecutive `--key` tokens consume the immediately following token as their value.
 * Unknown or boolean-style flags (no following value) are stored as empty strings.
 *
 * @param argv - The argument list to parse, typically `process.argv.slice(2)`.
 * @returns A map of flag name (without the `--` prefix) to its string value.
 */
export function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      result[arg.slice(2)] = argv[i + 1] ?? '';
      i++;
    }
  }
  return result;
}
