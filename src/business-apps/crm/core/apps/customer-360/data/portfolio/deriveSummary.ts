/**
 * Provisional summary derivation.
 *
 * Until the `customer-summary-list` backend aggregation endpoint exists, we
 * still want the cockpit and explorer attention filters to be meaningful. This helper
 * derives a *provisional* health value from real CRM fields only — currently
 * owner assignment — and never invents ticket/finance counts. Provisional
 * summaries are flagged so the UI can disclose them and so they can be
 * transparently replaced by real backend data later.
 */

import type { CustomerPortfolioSummary } from './types'

export interface ProvisionalSignals {
  ownerId?: string
}

const BASE_HEALTH = 82

export function deriveProvisionalSummary({ ownerId }: ProvisionalSignals): CustomerPortfolioSummary {
  let health = BASE_HEALTH
  if (!ownerId) health -= 20

  return {
    health: Math.max(0, Math.min(100, health)),
    provisional: true
  }
}
