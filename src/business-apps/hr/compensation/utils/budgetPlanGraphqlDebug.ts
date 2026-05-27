/**
 * Helpers for debugging CompensationBudgetPlan GraphQL issues.
 *
 * **Browser DevTools**
 * 1. Open Network → filter "graphql" → open the failed POST → Payload / Response.
 * 2. Copy the `query` and `errors` JSON; compare with schema.
 *
 * **Introspection** (GraphQL Playground / Insomnia / curl with same auth as the app):
 * Paste one of the `INTROSPECT_*` queries below — they are not used by the runtime app.
 */

/** Paste into GraphiQL / Playground; not executed by the compensation-planning UI. */
export const INTROSPECT_COMPENSATION_BUDGET_PLAN_FIELDS = `
  query IntrospectCompensationBudgetPlan {
    __type(name: "CompensationBudgetPlan") {
      name
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`

/** Paste into GraphiQL / Playground; not executed by the compensation-planning UI. */
export const INTROSPECT_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_FIELDS = `
  query IntrospectCompensationBudgetPlanOrganizationalUnit {
    __type(name: "CompensationBudgetPlanOrganizationalUnit") {
      name
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`

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
