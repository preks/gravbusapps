/**
 * Provisional summary derivation.
 *
 * Until the `customer-summary-list` backend aggregation endpoint exists, we
 * still want the cockpit and attention worklist to be meaningful. This helper
 * derives a *provisional* health value from real CRM fields only — owner
 * assignment and the prospective flag — and never invents ticket/finance
 * counts. Provisional summaries are flagged so the UI can disclose them and so
 * they can be transparently replaced by real backend data later.
 */

import type { CustomerPortfolioSummary } from './types'

export interface ProvisionalSignals {
  ownerId?: string
  prospective?: boolean
}

const BASE_HEALTH = 82

export function deriveProvisionalSummary({ ownerId, prospective }: ProvisionalSignals): CustomerPortfolioSummary {
  let health = BASE_HEALTH
  if (prospective) health -= 45
  if (!ownerId) health -= 20

  return {
    health: Math.max(0, Math.min(100, health)),
    provisional: true
  }
}
