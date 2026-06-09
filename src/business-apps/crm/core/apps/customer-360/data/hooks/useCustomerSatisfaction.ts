import type { Customer360Subject, CustomerSatisfaction, DomainHookResult } from '../types'

/**
 * Customer satisfaction (CSAT / NPS).
 *
 * AWAITING BACKEND: there is no CSAT/NPS field or dataset exposed for accounts
 * or contacts yet. This hook intentionally returns an empty (undefined) slice so
 * the KPI header and Scoring & Satisfaction tab render a clearly-marked
 * awaiting-data state. Once a satisfaction field/dataset exists, fetch it here
 * (keeping the `(accessToken, subject)` signature) and return the populated
 * `CustomerSatisfaction` slice.
 */
export function useCustomerSatisfaction(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerSatisfaction | undefined> {
  void accessToken
  void subject
  return { data: undefined, loading: false, error: null }
}
