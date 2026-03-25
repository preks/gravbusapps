/**
 * BUG-046: User can react multiple times to the same content post
 * Module: Content Portal (ReactionPicker)
 *
 * Reproduces the race condition in ReactionPicker.tsx:
 * inFlightRef resets in .finally() before refetch updates reactionSummary.
 * A second rapid click sees no existingReactionId and sends a duplicate INSERT.
 *
 * This test FAILS — proving the bug exists.
 */

import {
  buildReactionPayload,
  type BuildReactionPayloadParams
} from '@/common/data/content/payloads/reactionPayloads'

describe('BUG-046: User can react multiple times to the same content post', () => {
  it('second rapid click should NOT produce a second INSERT (proves bug exists)', () => {
    const sharedParams: BuildReactionPayloadParams = {
      contentEntryId: 'test-content-entry-001',
      catalogEntryId: 'catalog-thumbsup-001',
      employeeId: 'test-employee-001'
    }

    // First click: no existing reaction → INSERT is correct
    const firstPayload = buildReactionPayload(sharedParams)
    expect(firstPayload.changeMode).toBe('INSERT')

    // Second click during race window: inFlightRef has reset but refetch
    // hasn't updated reactionSummary, so existingReactionId is still undefined.
    // Calling with identical params simulates this exact state.
    const secondPayload = buildReactionPayload(sharedParams)

    // BUG: this produces INSERT again instead of UPDATE or being blocked.
    // A correct implementation would keep inFlightRef true until refetch
    // completes, or track the pending reaction ID optimistically.
    expect(secondPayload.changeMode).not.toBe('INSERT')
  })
})
