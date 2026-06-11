import { remoteEchoKey, toEchoSignature } from '../univerGridAuthoritativeHelpers'
import { selectionReconcileHasAuthoritativeDiff } from '../univerMountHandleDetectedCellMutationRemoteEcho'

describe('selectionReconcileHasAuthoritativeDiff', () => {
  it('ignores style-only worksheet cells during selection reconcile', () => {
    const lastSyncedGridCellSignaturesRef = {
      current: new Map([[remoteEchoKey(0, 0), toEchoSignature('')]])
    }

    const hasDiff = selectionReconcileHasAuthoritativeDiff({ lastSyncedGridCellSignaturesRef } as never, {
      0: {
        0: { s: 'style-1' }
      }
    })

    expect(hasDiff).toBe(false)
  })

  it('still detects value changes during selection reconcile', () => {
    const lastSyncedGridCellSignaturesRef = {
      current: new Map([[remoteEchoKey(0, 0), toEchoSignature('old')]])
    }

    const hasDiff = selectionReconcileHasAuthoritativeDiff({ lastSyncedGridCellSignaturesRef } as never, {
      0: {
        0: { v: 'new', s: 'style-1' }
      }
    })

    expect(hasDiff).toBe(true)
  })
})
