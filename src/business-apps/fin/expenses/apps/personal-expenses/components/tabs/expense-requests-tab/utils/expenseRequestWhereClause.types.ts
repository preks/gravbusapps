/**
 * GraphQL `where`-clause for expense request list queries.
 * Uses loose fragments: filters include nested `_or` / `expenseItem` shapes not worth fully encoding.
 */
export type ExpenseRequestWhereFragment = Record<string, unknown>

export interface ExpenseRequestWhereClause {
  _and?: ExpenseRequestWhereFragment[]
}
