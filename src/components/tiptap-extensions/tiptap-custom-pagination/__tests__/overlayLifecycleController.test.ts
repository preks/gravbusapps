import {
  applyPaginationOverlayOptionRefresh,
  resolveActivePaginationOverlayEditor
} from '../overlayLifecycleController'

function createFrameSchedulerHarness() {
  const callbacks: FrameRequestCallback[] = []

  return {
    scheduleFrame: (callback: FrameRequestCallback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    flushAll: () => {
      while (callbacks.length > 0) {
        callbacks.shift()?.(0)
      }
    }
  }
}

describe('resolveActivePaginationOverlayEditor', () => {
  it('returns the active header/footer editor when present', () => {
    expect(
      resolveActivePaginationOverlayEditor({
        activeEditorType: 'footer',
        activePageNumber: 6
      } as never)
    ).toEqual({
      type: 'footer',
      pageNumber: 6
    })
  })

  it('returns null when no active header/footer editor exists', () => {
    expect(
      resolveActivePaginationOverlayEditor({
        activeEditorType: null,
        activePageNumber: null
      } as never)
    ).toBeNull()
  })
})

describe('applyPaginationOverlayOptionRefresh', () => {
  it('refreshes without reopen when there is no active editor', () => {
    const events: string[] = []

    const result = applyPaginationOverlayOptionRefresh({
      activeEditor: null,
      overlayManager: {
        suppressNextCloseNotificationOnce: () => {
          events.push('suppress-close')
        },
        updateAccentColor: () => {
          events.push('update-accent')
        }
      },
      closeOverlay: () => {
        events.push('close-overlay')
      },
      applyUpdates: () => {
        events.push('apply-updates')
      },
      refresh: () => {
        events.push('refresh')
        return true
      },
      reopenActiveEditor: () => {
        events.push('reopen-active-editor')
      }
    })

    expect(result).toBe(true)
    expect(events).toEqual(['close-overlay', 'apply-updates', 'update-accent', 'refresh'])
  })

  it('suppresses close and reopens the active editor on the next frame', () => {
    const scheduler = createFrameSchedulerHarness()
    const events: string[] = []

    const result = applyPaginationOverlayOptionRefresh({
      activeEditor: {
        type: 'header',
        pageNumber: 3
      },
      overlayManager: {
        suppressNextCloseNotificationOnce: () => {
          events.push('suppress-close')
        },
        updateAccentColor: () => {
          events.push('update-accent')
        }
      },
      closeOverlay: () => {
        events.push('close-overlay')
      },
      applyUpdates: () => {
        events.push('apply-updates')
      },
      refresh: () => {
        events.push('refresh')
        return true
      },
      reopenActiveEditor: activeEditor => {
        events.push(`reopen:${activeEditor.type}:${activeEditor.pageNumber}`)
      },
      scheduleFrame: scheduler.scheduleFrame
    })

    expect(result).toBe(true)
    expect(events).toEqual(['suppress-close', 'close-overlay', 'apply-updates', 'update-accent', 'refresh'])

    scheduler.flushAll()

    expect(events).toEqual([
      'suppress-close',
      'close-overlay',
      'apply-updates',
      'update-accent',
      'refresh',
      'reopen:header:3'
    ])
  })
})
