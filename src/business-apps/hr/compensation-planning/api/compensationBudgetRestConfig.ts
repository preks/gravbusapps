import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'

/**
 * Compensation budget REST calls use the employee process service
 * (`NEXT_PUBLIC_EMPLOYEES_API_URL` → `/processes/employee`, same as {@link EMPLOYEES_API_URL}).
 * Full URLs: `{COMPENSATION_BUDGET_REST_BASE_URL}{CREATE_COMPENSATION_BUDGET_PLAN_PATH}` etc.
 */
export const COMPENSATION_BUDGET_REST_BASE_URL = EMPLOYEES_API_URL

/** Path segment for creating a plan (appended to {@link COMPENSATION_BUDGET_REST_BASE_URL}). */
export const CREATE_COMPENSATION_BUDGET_PLAN_PATH = '/createCompensationBudgetPlan'

/** Path segment for creating a plan–company row (budget setup “add” form). */
export const CREATE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH = '/createCompensationBudgetPlanCompany'

/** Path segment for updating a plan–company row (e.g. distribution method). */
export const SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH = '/saveCompensationBudgetPlanCompany'

/** Path segment for inserting/updating plan–org-unit budget rows. */
export const SAVE_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_PATH = '/saveCompensationBudgetPlanOrganizationalUnit'
