/**
 * GraphQL documents for compensation budget plans (Hasura).
 *
 * - **Plan registry** — `LIST_COMPENSATION_BUDGET_PLANS`, `GET_BUDGET_SETUP_PLANS_AND_COMPANY_BUDGET_ROWS` (batched), `GET_COMPENSATION_BUDGET_PLAN_COMPANY`
 * - **Manager context (single round-trip)** — `GET_MANAGER_COMPENSATION_BUDGET_CONTEXT`
 * - **Company / org-unit / employee rows** — `LIST_COMPENSATION_BUDGET_PLAN_*` variants
 *
 * Dev-only introspection strings live in `utils/budgetPlanGraphqlDebug.ts` (not bundled as app queries).
 */

export const LIST_COMPENSATION_BUDGET_PLANS = `
  query ListCompensationBudgetPlans {
    CompensationBudgetPlan(
      where: { isDeleted: { _eq: false } }
      orderBy: [{ fiscalYear: DESC }, { name: ASC }]
      limit: 100
    ) {
      id
      version
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

/**
 * Single HTTP round-trip for Budget setup: global plan list plus all `CompensationBudgetPlanCompany` rows for one company.
 * Replaces separate `LIST_COMPENSATION_BUDGET_PLANS` + `LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY` when both are needed.
 */
export const GET_BUDGET_SETUP_PLANS_AND_COMPANY_BUDGET_ROWS = `
  query GetBudgetSetupPlansAndCompanyBudgetRows($companyId: uuid!) {
    CompensationBudgetPlan(
      where: { isDeleted: { _eq: false } }
      orderBy: [{ fiscalYear: DESC }, { name: ASC }]
      limit: 100
    ) {
      id
      version
      name
      description
      fiscalYear
      startDate
      endDate
      effectiveDate
      budgetPlanStatus
    }
    CompensationBudgetPlanCompany(
      where: { companyId: { _eq: $companyId }, isDeleted: { _eq: false } }
      orderBy: [{ compensationBudgetPlanId: ASC }, { id: ASC }]
      limit: 500
    ) {
      id
      version
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
 * One round-trip for manager salary-budget context: position OU + all plans + all company budget rows for the legal entity.
 * (Org-unit lines still need a second request once `compensationBudgetPlanCompanyId` is chosen client-side.)
 */
export const GET_MANAGER_COMPENSATION_BUDGET_CONTEXT = `
  query GetManagerCompensationBudgetContext($companyId: uuid!, $employeeId: uuid!) {
    managerEmployeePosition: EmployeePosition(
      where: { employeeId: { _eq: $employeeId }, companyId: { _eq: $companyId } }
      limit: 1
    ) {
      organizationalUnitId
    }
    compensationBudgetPlans: CompensationBudgetPlan(
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
    compensationBudgetPlanCompanies: CompensationBudgetPlanCompany(
      where: { companyId: { _eq: $companyId }, isDeleted: { _eq: false } }
      orderBy: [{ compensationBudgetPlanId: ASC }, { id: ASC }]
      limit: 500
    ) {
      id
      version
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

/** All company budget rows for a legal entity (multiple rows may share the same plan id). */
export const LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY = `
  query ListCompensationBudgetPlanCompanyByCompany($companyId: uuid!) {
    CompensationBudgetPlanCompany(
      where: { companyId: { _eq: $companyId }, isDeleted: { _eq: false } }
      orderBy: [{ compensationBudgetPlanId: ASC }, { id: ASC }]
      limit: 500
    ) {
      id
      version
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

/** All org-unit budget rows for any company-budget row in `$compensationBudgetPlanCompanyIds` (Manager Submissions tab). */
export const LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET_IDS = `
  query ListCompensationBudgetPlanOrganizationalUnitByCompanyBudgetIds(
    $compensationBudgetPlanCompanyIds: [uuid!]!
  ) {
    CompensationBudgetPlanOrganizationalUnit(
      where: {
        _and: [
          { compensationBudgetPlanCompanyId: { _in: $compensationBudgetPlanCompanyIds } },
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: [{ organizationalUnitId: ASC }, { compensationBudgetPlanCompanyId: ASC }]
      limit: 2000
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

/** Employee-level budget proposals for org-unit budget rows (supervisor / execution). */
export const LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS = `
  query ListCompensationBudgetPlanEmployeesByOrgUnitIds($orgUnitBudgetIds: [uuid!]!) {
    CompensationBudgetPlanEmployee(
      where: {
        _and: [
          { compensationBudgetPlanOrganizationalUnitId: { _in: $orgUnitBudgetIds } },
          { isDeleted: { _eq: false } }
        ]
      }
      limit: 5000
    ) {
      id
      version
      budgetPlanStatus
      employeeId
      proposedSalaryIncreaseAmount
      proposedSalaryIncreasePercent
      proposedNewSalary
      justification
      submittedAt
      reviewNotes
      compensationBudgetPlanOrganizationalUnitId
      submittedByEmployeeId
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
      version
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
