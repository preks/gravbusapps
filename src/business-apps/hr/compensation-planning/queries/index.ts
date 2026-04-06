/**
 * GraphQL documents for compensation planning.
 *
 * | UI | Source | Purpose |
 * |----|--------|---------|
 * | Budget setup tab | `./budgetPlanQueries` | List plans, plan–company budget row (reads only; writes use REST in hooks) |
 * | Overview tab | `./compensationPlanningQueries` | Team members, current salaries, bonuses (with `useTeamCompensationData`) |
 *
 * Org chart / companies use shared hooks (`useActiveStructureCompanies`, etc.), not this folder.
 */

export * from './budgetPlanQueries'
export * from './compensationPlanningQueries'
