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

/** Manager team view: org unit for the user’s position in the selected company (salary budget row key). */
export const GET_EMPLOYEE_POSITION_ORG_UNIT_IN_COMPANY = `
  query GetEmployeePositionOrgUnitInCompany($employeeId: uuid!, $companyId: uuid!) {
    EmployeePosition(
      where: { employeeId: { _eq: $employeeId }, companyId: { _eq: $companyId } }
      limit: 1
    ) {
      organizationalUnitId
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
