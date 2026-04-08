/**
 * Compensation budget REST calls use the employee process service
 * (`NEXT_PUBLIC_EMPLOYEES_API_URL` → `/processes/employee`, same as {@link EMPLOYEES_API_URL} from service resolver).
 * Full URLs: `{COMPENSATION_BUDGET_REST_BASE_URL}{SAVE_COMPENSATION_BUDGET_PLAN_PATH}` etc.
 */
export { EMPLOYEES_API_URL as COMPENSATION_BUDGET_REST_BASE_URL } from '@/common/utils/serviceResolver'

/** Path segment for inserting/updating a compensation budget **plan** (budget plan tab). */
export const SAVE_COMPENSATION_BUDGET_PLAN_PATH = '/saveCompensationBudgetPlan'

/** Path segment for inserting/updating a plan–company budget row (budget setup). */
export const SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH = '/saveCompensationBudgetPlanCompany'

/** Path segment for inserting/updating plan–org-unit budget rows. */
export const SAVE_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_PATH = '/saveCompensationBudgetPlanOrganizationalUnit'

/** Path segment for inserting/updating plan–employee budget rows (manager proposals). */
export const SAVE_COMPENSATION_BUDGET_PLAN_EMPLOYEE_PATH = '/saveCompensationBudgetPlanEmployee'
