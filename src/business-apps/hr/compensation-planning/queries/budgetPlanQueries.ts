/**
 * Budget setup: `compensation_budget_plan` + `compensation_budget_plan_company`
 * (salary/bonus amount + percent, distribution_method, budget_plan_status,
 * current_total_salary_cost, headcount, currency_ref, …).
 *
 * Budget distribution: `nw_employee.compensation_budget_plan_organizational_unit` — FK
 * `compensation_budget_plan_company_id` → `compensation_budget_plan_company`.
 * DB columns (budget-related): `bonus_budget_amount`, `bonus_budget_percent`, `budget_plan_status`,
 * `salary_budget_amount`, `salary_budget_percent`, `is_deleted`, `compensation_budget_plan_company_id`,
 * `organizational_unit_id`; plus base entity fields (`id`, `acl`, `synchronized_at`, `zed_token`,
 * `active_from`, `active_to`, `additional_properties`, `business_key`, `created_at`, `created_by`,
 * `process_instance_id`, `record_state`, `updated_at`, `updated_by`, `version`).
 *
 * **Permissions:** `select` on both tables (and relationships) for the app role;
 * `insert` / `update` for create plan and save company budget.
 *
 * **Verify after access:** run `INTROSPECT_COMPENSATION_BUDGET_PLAN_FIELDS` in Playground with the same Bearer token.
 */

/** Introspection: run in GraphQL Playground with the same auth as the app. */
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

/** Introspection: GraphQL field names for `CompensationBudgetPlanOrganizationalUnit` (align queries with Hasura). */
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

/**
 * Active plans only (`isDeleted: false`), newest fiscal years first.
 * Sort in the hook is kept as a fallback for older servers without `orderBy`.
 */
export const LIST_COMPENSATION_BUDGET_PLANS = `
  query ListCompensationBudgetPlans {
    CompensationBudgetPlan(
      where: { isDeleted: { _eq: false } }
      orderBy: [{ fiscalYear: DESC }, { name: ASC }]
      limit: 100
    ) {
      id
      name
      description
      fiscalYear
      startDate
      endDate
      effectiveDate
      budgetPlanStatus
    }
  }
`

/** Same field set as the list query; use for targeted refresh by id (optional). */
export const GET_COMPENSATION_BUDGET_PLAN_BY_PK = `
  query GetCompensationBudgetPlanByPk($id: uuid!) {
    CompensationBudgetPlan_by_pk(id: $id) {
      id
      name
      description
      fiscalYear
      startDate
      endDate
      effectiveDate
      budgetPlanStatus
    }
  }
`

/** All company budget rows for a legal entity (multiple rows may share the same plan id). */
export const LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY = `
  query ListCompensationBudgetPlanCompanyByCompany($companyId: uuid!) {
    CompensationBudgetPlanCompany(
      where: { companyId: { _eq: $companyId }, isDeleted: { _eq: false } }
      orderBy: [{ compensationBudgetPlanId: ASC }, { id: ASC }]
      limit: 500
    ) {
      id
      compensationBudgetPlanId
      companyId
      salaryBudgetAmount
      salaryBudgetPercent
      bonusBudgetAmount
      bonusBudgetPercent
      budgetPlanStatus
      currentTotalSalaryCost
      distributionMethod
      headcount
      currencyRef
    }
  }
`

/**
 * Org unit rows for one company budget row. No `organizationalUnit` join here — Hasura may not expose
 * that relationship; resolve names client-side via `OrganizationalUnit` (e.g. `useCompanyOrganizationalUnits`).
 */
export const LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET = `
  query ListCompensationBudgetPlanOrganizationalUnitByCompanyBudget(
    $compensationBudgetPlanCompanyId: uuid!
  ) {
    CompensationBudgetPlanOrganizationalUnit(
      where: {
        _and: [
          { compensationBudgetPlanCompanyId: { _eq: $compensationBudgetPlanCompanyId } },
          { isDeleted: { _eq: false } }
        ]
      }
      limit: 500
    ) {
      id
      compensationBudgetPlanCompanyId
      organizationalUnitId
      salaryBudgetAmount
      salaryBudgetPercent
      bonusBudgetAmount
      bonusBudgetPercent
      budgetPlanStatus
    }
  }
`

export const GET_COMPENSATION_BUDGET_PLAN_COMPANY = `
  query GetCompensationBudgetPlanCompany($planId: uuid!, $companyId: uuid!) {
    CompensationBudgetPlanCompany(
      where: {
        compensationBudgetPlanId: { _eq: $planId }
        companyId: { _eq: $companyId }
        isDeleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      compensationBudgetPlanId
      companyId
      salaryBudgetAmount
      salaryBudgetPercent
      bonusBudgetAmount
      bonusBudgetPercent
      budgetPlanStatus
      currentTotalSalaryCost
      distributionMethod
      headcount
      currencyRef
    }
  }
`

export const INSERT_COMPENSATION_BUDGET_PLAN = `
  mutation InsertCompensationBudgetPlan($object: CompensationBudgetPlanInsertInput!) {
    insert_CompensationBudgetPlan_one(object: $object) {
      id
      name
      description
      fiscalYear
      startDate
      endDate
      effectiveDate
      budgetPlanStatus
    }
  }
`

export const INSERT_COMPENSATION_BUDGET_PLAN_COMPANY = `
  mutation InsertCompensationBudgetPlanCompany($object: CompensationBudgetPlanCompanyInsertInput!) {
    insert_CompensationBudgetPlanCompany_one(object: $object) {
      id
      compensationBudgetPlanId
      companyId
      salaryBudgetAmount
      salaryBudgetPercent
      bonusBudgetAmount
      bonusBudgetPercent
      budgetPlanStatus
      currentTotalSalaryCost
      distributionMethod
      headcount
      currencyRef
    }
  }
`

export const UPDATE_COMPENSATION_BUDGET_PLAN_COMPANY_BY_PK = `
  mutation UpdateCompensationBudgetPlanCompanyByPk(
    $id: uuid!
    $changes: CompensationBudgetPlanCompanySetInput!
  ) {
    update_CompensationBudgetPlanCompany_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      salaryBudgetAmount
      salaryBudgetPercent
      bonusBudgetAmount
      bonusBudgetPercent
      budgetPlanStatus
      currentTotalSalaryCost
      distributionMethod
      headcount
      currencyRef
    }
  }
`
