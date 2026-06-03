---
name: working-condition-checklist
overview: Create a reusable checklist for the working-condition history rollout, grouped by implementation complexity so easy items can be handled first and hard items can be reserved for team discussion.
todos:
  - id: easy-region-country
    content: Implement and test easy active region / country lookup items
    status: completed
  - id: easy-contract-display
    content: Implement and test easy active contract and employment type display items
    status: completed
  - id: medium-contract-fields
    content: Implement and test medium active working-condition fields in employee record, My Team Time, compensation, and entitlements
    status: completed
  - id: hard-team-discussion
    content: Discuss hard payroll, reports, analytics, source-flow, audit, and flight-risk cases with team leads
    status: pending
isProject: false
---

# Working Condition History Checklist

Use this file as the tracking list for implementation and manual testing. Mark items as done with `[x]` only after the implementation is merged or manually verified, depending on your team workflow.

## Selection Rule

For current/active working-condition use cases:

- If there is only one `workingCondition` entry, treat it as active legacy data.
- If there are multiple entries, use the one where the target date is within `activeFrom` and `activeTo`, inclusive.
- Treat `activeTo = null` as open-ended.
- Do not assume `workingCondition[0]` is active unless the query explicitly guarantees that order and filtering.
- Do not use `hireDate` to select the active working condition.
- `hireDate` stays on working conditions for now and is expected to be copied to every working-condition entry.
- For timeframe reports, payroll, analytics, and history screens, agree on the target period before changing behavior.

## Contract-Varying Fields

Active working-condition selection applies to fields that can vary over contract history:

- `contractType`
- `employmentType`
- `region`
- `remote`
- `vacationDays`
- `probationEnd`
- `activeFrom` / `activeTo`
- contract-related salary or payroll relevance fields where they are stored on working conditions

It does not apply to `hireDate` or tenure calculations.

## Easy

These are mostly current-row replacements for `workingCondition[0]` in simple display or lookup code where the field can vary per contract.

### Simple Active Region / Country Lookup

- [x] [src/business-apps/hr/core/apps/employee-record/queries/attendanceQueries.ts](src/business-apps/hr/core/apps/employee-record/queries/attendanceQueries.ts) - Check employee region lookup query.
- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/utils/fetchHolidayDates.ts](src/business-apps/hr/core/apps/employee-record/components/tabs/utils/fetchHolidayDates.ts) - Check holidays use active region.
- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData.ts](src/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeTrackingData.ts) - Check holiday dates by active region.
- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeInterventions.ts](src/business-apps/hr/core/apps/employee-record/components/tabs/hooks/useTimeInterventions.ts) - Check holiday/region logic.
- [x] [src/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences.ts](src/business-apps/hr/core/forms/create-new-absence/queries/getEmployeeAbsences.ts) - Check region lookup for absence holidays.
- [x] [src/business-apps/hr/core/forms/create-new-absence/utils/employmentRegion.ts](src/business-apps/hr/core/forms/create-new-absence/utils/employmentRegion.ts) - Check active region resolution.
- [x] [src/business-apps/hr/absences/queries/holidaysQueries.ts](src/business-apps/hr/absences/queries/holidaysQueries.ts) - Check employee region query.
- [x] [src/business-apps/hr/absences/hooks/usePublicHolidays.ts](src/business-apps/hr/absences/hooks/usePublicHolidays.ts) - Check public holidays for employee active region.

### Simple Contract / Employment Type Display

- [x] [src/business-apps/hr/core/details/employee-details/EmployeeDetails.tsx](src/business-apps/hr/core/details/employee-details/EmployeeDetails.tsx) - Check active employment type and contract type.
- [x] [src/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports.ts](src/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports.ts) - Check active employment type display.
- [x] [src/business-apps/ser/apps/service-portal/hooks/useRealEmployeeData.ts](src/business-apps/ser/apps/service-portal/hooks/useRealEmployeeData.ts) - Check active employment and contract type in employee picker.
- [x] [src/business-apps/fin/expenses/apps/expense-settings/queries/ExpenseRuleQueries.ts](src/business-apps/fin/expenses/apps/expense-settings/queries/ExpenseRuleQueries.ts) - Check active contract and employment type for employee assignment.

### Simple Country-Dependent Forms

- [x] [src/business-apps/hr/core/forms/change-tax-details/ChangeTaxDetailsQueries.ts](src/business-apps/hr/core/forms/change-tax-details/ChangeTaxDetailsQueries.ts) - Check employee country query.
- [x] [src/business-apps/hr/core/forms/change-tax-details/useChangeTaxDetailsData.ts](src/business-apps/hr/core/forms/change-tax-details/useChangeTaxDetailsData.ts) - Check employee country from active region.
- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/compensation/queries/benefitCatalogQueries.ts](src/business-apps/hr/core/apps/employee-record/components/tabs/compensation/queries/benefitCatalogQueries.ts) - Check benefit catalog region query.
- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/compensation/hooks/useBenefitsCatalog.ts](src/business-apps/hr/core/apps/employee-record/components/tabs/compensation/hooks/useBenefitsCatalog.ts) - Check benefit catalog country/region.
- [x] [src/business-apps/hr/core/forms/grant-employee-bonus/GrantEmployeeBonusQueries.ts](src/business-apps/hr/core/forms/grant-employee-bonus/GrantEmployeeBonusQueries.ts) - Check bonus region query.
- [x] [src/business-apps/hr/core/forms/grant-employee-bonus/GrantEmployeeBonusContext.tsx](src/business-apps/hr/core/forms/grant-employee-bonus/GrantEmployeeBonusContext.tsx) - Check bonus currency country lookup.

## Medium

These need active-row handling plus more local business logic or shared data-flow review. Hire-date-only filtering is not active working-condition work because hire date is copied across working-condition entries.

### Employee Record Main Data

- [x] [src/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData.ts](src/business-apps/hr/core/apps/employee-record/hooks/useEmployeeData.ts) - Central employee-record fetch; check ordering and active selection for contract-varying fields.
- [x] [src/business-apps/hr/core/details/employee-details/queries/EmployeeDetailsQueries.ts](src/business-apps/hr/core/details/employee-details/queries/EmployeeDetailsQueries.ts) - Check query supports active selection for contract and employment type.
- [x] [src/business-apps/hr/core/details/employee-details/hooks/useEmployeeDetailsData.ts](src/business-apps/hr/core/details/employee-details/hooks/useEmployeeDetailsData.ts) - Check data mapping preserves active-row information for contract-varying fields.

### Employee Record Employment Tab

- [x] [src/business-apps/hr/core/apps/employee-record/components/tabs/EmploymentTab.tsx](src/business-apps/hr/core/apps/employee-record/components/tabs/EmploymentTab.tsx) - Check multiple contract navigation, active default selection, continuity warning, and remaining `workingCondition[0]` usage for region/country and other contract-varying fields.

### Manager Dashboard Contract Fields

- [x] [src/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports.ts](src/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports.ts) - Check active employment type mapping after the query returns multiple working conditions.

### My Team Time

- [x] [src/business-apps/hr/core/apps/my-team-time/queries/queries.ts](src/business-apps/hr/core/apps/my-team-time/queries/queries.ts) - Check member region query. Hire date remains copied across working-condition entries.
- [x] [src/business-apps/hr/core/apps/my-team-time/utils/teamTimeDomain.ts](src/business-apps/hr/core/apps/my-team-time/utils/teamTimeDomain.ts) - Check region-based holidays use active region.

### Salary / Compensation Forms

- [x] [src/business-apps/hr/core/forms/adjust-employee-salary/AdjustEmployeeSalaryQueries.ts](src/business-apps/hr/core/forms/adjust-employee-salary/AdjustEmployeeSalaryQueries.ts) - Check active region and current contract query. Hire date remains copied across working-condition entries.
- [x] [src/business-apps/hr/core/forms/adjust-employee-salary/AdjustEmployeeSalaryContext.tsx](src/business-apps/hr/core/forms/adjust-employee-salary/AdjustEmployeeSalaryContext.tsx) - Check active region for country currency.
- [x] [src/business-apps/hr/compensation-planning/queries/compensationPlanningQueries.ts](src/business-apps/hr/compensation-planning/queries/compensationPlanningQueries.ts) - Check team member working condition query for contract-varying fields.
- [x] [src/business-apps/hr/compensation-planning/apps/manager-compensation-planning/hooks/useTeamCompensationData.ts](src/business-apps/hr/compensation-planning/apps/manager-compensation-planning/hooks/useTeamCompensationData.ts) - Check payroll-relevant contract filtering.

### Entitlements / Vacation Days

- [x] [src/business-apps/hr/core/forms/update-employee-entitlements/UpdateEmployeeEntitlementsQueries.ts](src/business-apps/hr/core/forms/update-employee-entitlements/UpdateEmployeeEntitlementsQueries.ts) - Check active vacation days query. Hire date remains copied across working-condition entries.
- [x] [src/business-apps/hr/core/forms/update-employee-entitlements/context/UpdateEmployeeEntitlementsContext.tsx](src/business-apps/hr/core/forms/update-employee-entitlements/context/UpdateEmployeeEntitlementsContext.tsx) - Check active vacation days mapping.
- [x] [src/business-apps/hr/absences/forms/approve-employee-vacation/queries/vacationQueries.ts](src/business-apps/hr/absences/forms/approve-employee-vacation/queries/vacationQueries.ts) - Check vacation days from correct contract.

### Platform Board / Registry

- [x] [src/business-apps/platform/apps/board-apps/queries/graphql.ts](src/business-apps/platform/apps/board-apps/queries/graphql.ts) - Check `limit: 1` by hire date vs active contract semantics for contract/employment fields.
- [x] [src/business-apps/platform/apps/board-apps/queries/entityRegistry.ts](src/business-apps/platform/apps/board-apps/queries/entityRegistry.ts) - Check `workingCondition.0.*` mappings for contract-varying fields.

## Hard

These require team agreement because active-today is not enough, or because the feature owns source data/history.

### Payroll Preparation

- [x] [src/business-apps/hr/payroll/apps/payroll-preparation/queries/payrollQueries.ts](src/business-apps/hr/payroll/apps/payroll-preparation/queries/payrollQueries.ts) - Decide payroll-month effective contract rules.
- [x] [src/business-apps/hr/payroll/apps/payroll-preparation/hooks/usePayrollEmployees.ts](src/business-apps/hr/payroll/apps/payroll-preparation/hooks/usePayrollEmployees.ts) - Check contract type, employment type, region, exit date, and payroll relevance for selected payroll month. Hire date remains copied across working-condition entries.

### Team Report KPIs

- [x] `src/business-apps/hr/reports/apps/my-team-report` - Removed redundant report app after confirmation that it is no longer used.

### HR Analytics

- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/workingCondition.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/workingCondition.ts) - Decide yearly forecast period behavior.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getMonthlySalaryForecast.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getMonthlySalaryForecast.ts) - Decide monthly active salary/headcount behavior.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getSalaryByOrgUnit.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getSalaryByOrgUnit.ts) - Decide salary by org unit behavior with multiple contracts.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getMedianSalaryData.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/queries/getMedianSalaryData.ts) - Avoid double-counting employees with multiple contracts.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useWorkingConditionForecast.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useWorkingConditionForecast.ts) - Check forecast consumer logic.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useMonthlySalaryForecast.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useMonthlySalaryForecast.ts) - Check monthly forecast consumer logic.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useDepartmentMonthlySalaryStack.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useDepartmentMonthlySalaryStack.ts) - Check department salary stack logic.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useMedianSalary.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useMedianSalary.ts) - Check median salary consumer logic.
- [x] [src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useAverageSalary.ts](src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useAverageSalary.ts) - Check dataset semantics.

### Update Working Conditions Flow

- [x] [src/business-apps/hr/core/forms/update-working-conditions/queries/UpdateWorkingConditionsQueries.ts](src/business-apps/hr/core/forms/update-working-conditions/queries/UpdateWorkingConditionsQueries.ts) - Confirm active fetch, legacy support, validation records, and ordering.
- [x] [src/business-apps/hr/core/forms/update-working-conditions/UpdateWorkingConditionsScreen.tsx](src/business-apps/hr/core/forms/update-working-conditions/UpdateWorkingConditionsScreen.tsx) - Confirm add/update behavior, overlap validation, continuity, and submit payload.
- [x] [src/business-apps/hr/core/forms/update-working-conditions/UpdateWorkingConditionsChangeModeDialog.tsx](src/business-apps/hr/core/forms/update-working-conditions/UpdateWorkingConditionsChangeModeDialog.tsx) - Confirm change mode behavior.

## Suggested Implementation Order

1. Easy active region/country lookup.
2. Easy contract/employment type display.
3. Easy country-dependent forms.
4. Medium employee record contract-varying fields.
5. Medium My Team Time region logic and salary/compensation forms.
6. Medium entitlements and board/registry.
7. Hard cases after team-lead agreement.
