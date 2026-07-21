import type { BotStateType, GraphConfigNode } from '../state.ts';

export function conditionalNode(state: BotStateType, config?: GraphConfigNode) {
  const input = config?.data?.input as Record<string, unknown> | undefined;
  const conditionals = (input?.conditionals as Array<Record<string, unknown>>) || [];

  if (conditionals.length === 0) return { conditionResult: 'false' };

  for (let i = 0; i < conditionals.length; i++) {
    const c = conditionals[i];
    const variable = (c.variable as string) || '';
    const operator = (c.operator as string) || '=';
    const matches = c.matches;
    const andConditions = (c.and as Array<Record<string, unknown>>) || [];

    let result = evaluateCondition(state, variable, operator, matches);

    for (const and of andConditions) {
      const andResult = evaluateCondition(
        state,
        (and.variable as string) || '',
        (and.operator as string) || '=',
        and.matches,
      );
      result = result && andResult;
      if (!result) break;
    }

    if (result) return { conditionResult: `source-if-${i}` };
  }

  return { conditionResult: 'source-else' };
}

function evaluateCondition(state: BotStateType, variable: string, operator: string, matches: unknown): boolean {
  const value =
    (state as Record<string, unknown>)[variable] ?? state.variables?.[variable as keyof typeof state.variables];
  const matchStr = String(matches ?? '');

  if (operator === '=' || operator === 'equals') return String(value ?? '') === matchStr;
  if (operator === '!=' || operator === 'not_equals') return String(value ?? '') !== matchStr;
  if (operator === 'contains') return String(value ?? '').includes(matchStr);
  if (operator === '>') return Number(value) > Number(matchStr);
  if (operator === '<') return Number(value) < Number(matchStr);
  if (operator === '>=') return Number(value) >= Number(matchStr);
  if (operator === '<=') return Number(value) <= Number(matchStr);
  if (operator === 'exists') return value !== undefined && value !== null && value !== '';

  return false;
}
