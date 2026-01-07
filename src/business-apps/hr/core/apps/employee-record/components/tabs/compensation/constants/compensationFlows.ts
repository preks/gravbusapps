/**
 * Compensation Flow Names for Kogito Integration
 *
 * These flow names are placeholders and will be registered in the Kogito Flow Registry.
 * Update these constants when the actual flows are implemented.
 *
 * @module compensationFlows
 */

/**
 * Flow name for requesting a new employee benefit
 *
 * **Status:** 🚧 PLACEHOLDER - Flow not yet implemented
 *
 * **Expected Payload:**
 * - employeeId: string
 * - benefitTypeRef: string (catalog ID)
 * - benefitProviderRef: string (catalog ID)
 * - yearlyAmount: number
 * - currencyRef: string
 * - startDate: string (ISO date)
 * - justification: string
 * - requestedBy: string (employee ID)
 * - requestDate: string (ISO date)
 * - status: 'PENDING'
 *
 * **Approval Flow:** Yes, requires manager approval
 *
 * **Note:** This flow will be registered in FlowRegistryTypes when Kogito backend is ready
 */
export const REQUEST_BENEFIT_FLOW = 'requestEmployeeBenefit'

/**
 * Flow name for deactivating an active employee benefit
 *
 * **Status:** 🚧 PLACEHOLDER - Flow not yet implemented
 *
 * **Expected Payload:**
 * - employeeBenefitId: string
 * - employeeId: string
 * - benefitType: string
 * - deactivationReason: string
 * - effectiveEndDate: string (ISO date)
 * - requestedBy: string (employee ID)
 * - requestDate: string (ISO date)
 *
 * **Approval Flow:** Conditional, based on benefit type and value
 *
 * **Note:** This flow will be registered in FlowRegistryTypes when Kogito backend is ready
 */
export const DEACTIVATE_BENEFIT_FLOW = 'deactivateEmployeeBenefit'

/**
 * Domain for all compensation-related flows
 */
export const COMPENSATION_FLOW_DOMAIN = 'human-resources'

/**
 * Future Flow Names (Phase 3+)
 * These are additional flows planned for future implementation
 */
export const FUTURE_COMPENSATION_FLOWS = {
  /**
   * Edit benefit value or provider
   */
  EDIT_BENEFIT: 'editEmployeeBenefit',

  /**
   * Bulk benefit operations
   */
  BULK_BENEFIT_REQUEST: 'bulkRequestBenefits',

  /**
   * Request salary adjustment
   */
  REQUEST_SALARY_ADJUSTMENT: 'requestSalaryAdjustment',

  /**
   * Request bonus
   */
  REQUEST_BONUS: 'requestBonus'
} as const
