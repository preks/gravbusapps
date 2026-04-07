/**
 * Helpers for debugging CompensationBudgetPlan GraphQL issues.
 *
 * **Browser DevTools**
 * 1. Open Network → filter "graphql" → open the failed POST → Payload / Response.
 * 2. Copy the `query` and `errors` JSON; compare with schema.
 *
 * **Introspection** (GraphQL Playground / Insomnia / curl with same auth as the app):
 * Paste `INTROSPECT_COMPENSATION_BUDGET_PLAN_FIELDS` from `queries/budgetPlanQueries.ts` (see `queries/index.ts`) and run.
 */

export function getGraphqlErrorsFromUnknown(err: unknown): unknown[] | undefined {
  if (err && typeof err === 'object' && 'graphqlErrors' in err) {
    const g = (err as { graphqlErrors?: unknown[] }).graphqlErrors
    return Array.isArray(g) ? g : undefined
  }
  return undefined
}

export function logBudgetGraphqlFailure(context: string, err: unknown): void {
  const graphqlErrors = getGraphqlErrorsFromUnknown(err)
  console.error(`[compensation-budget] ${context}`, {
    message: err instanceof Error ? err.message : String(err),
    graphqlErrors,
    raw: err
  })
}
