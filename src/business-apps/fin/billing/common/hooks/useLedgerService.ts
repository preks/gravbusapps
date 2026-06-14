/**
 * Ledger Service (MVP) - routes invoice lifecycle postings to the real BLNK
 * ledger through the NEWWORK Connect connector lane (the same lane Ledger Admin
 * uses), so issuing / paying / cancelling / writing-off an invoice creates real
 * ledger transactions that show up in Ledger Admin.
 *
 * Lanes (in priority order):
 *   1. NEWWORK Connect (prompt-manager invoke -> BLNK) when configured.
 *   2. Graceful no-op with a synthetic reference only when no ledger lane is
 *      configured, so sample-mode previews keep working without pretending a
 *      failed live posting succeeded.
 *
 * Idempotency: each posting carries a deterministic eventId. We dedupe in-memory
 * per session so accidental retries do not double-post; the connector also keys
 * on the per-transfer reference (`<eventId>#<index>`).
 */
import { useCallback, useMemo, useRef } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { LedgerPostingRequest, LedgerPostingResponse, LedgerService } from '../queries/billingCoreApi'
import { isPostingBalanced } from '../utils/ledgerPostings'
import { ledgerAdminEnabled, postLedgerTransaction } from '../network/ledgerAdminClient'

function syntheticResponse(request: LedgerPostingRequest): LedgerPostingResponse {
  return {
    ledgerTransactionRef: `local:${request.eventId}`,
    eventId: request.eventId,
    postedAt: new Date().toISOString()
  }
}

export function useLedgerService(context: Pick<BusinessAppContextProps, 'accessToken'>): LedgerService {
  // Cache of eventId -> response for the lifetime of this hook instance.
  const postedRef = useRef<Map<string, LedgerPostingResponse>>(new Map())

  const post = useCallback(
    async (request: LedgerPostingRequest): Promise<LedgerPostingResponse> => {
      if (!context.accessToken) {
        throw new Error('Ledger Service requires a valid access token')
      }
      if (!isPostingBalanced(request)) {
        throw new Error(`Refusing to post unbalanced ledger transaction for event ${request.eventId}`)
      }

      const cached = postedRef.current.get(request.eventId)
      if (cached) {
        return cached
      }

      let response: LedgerPostingResponse
      if (!ledgerAdminEnabled()) {
        response = syntheticResponse(request)
        postedRef.current.set(request.eventId, response)
        return response
      }

      const result = await postLedgerTransaction(context.accessToken, request)
      response = {
        ledgerTransactionRef: result.ledgerTransactionRef,
        eventId: request.eventId,
        postedAt: result.postedAt
      }

      postedRef.current.set(request.eventId, response)
      return response
    },
    [context.accessToken]
  )

  return useMemo<LedgerService>(() => ({ post }), [post])
}
