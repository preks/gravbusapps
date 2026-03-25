import {
  applyPaginationOptionRefresh,
  closePaginationOverlayAndRefresh,
  updatePaginationOverlayAccentColor
} from '../overlayCommandController'

describe('applyPaginationOptionRefresh', () => {
  it('applies updates and refreshes without closing by default', () => {
    const events: string[] = []

    const result = applyPaginationOptionRefresh({
      closeOverlay: () => {
        events.push('close-overlay')
      },
      applyUpdates: () => {
        events.push('apply-updates')
      },
      refresh: () => {
        events.push('refresh')
        return true
      }
    })

    expect(result).toBe(true)
    expect(events).toEqual(['apply-updates', 'refresh'])
  })

  it('closes first when requested', () => {
    const events: string[] = []

    applyPaginationOptionRefresh({
      shouldCloseOverlay: true,
      closeOverlay: () => {
        events.push('close-overlay')
      },
      applyUpdates: () => {
        events.push('apply-updates')
      },
      refresh: () => {
        events.push('refresh')
        return true
      }
    })

    expect(events).toEqual(['close-overlay', 'apply-updates', 'refresh'])
  })
})

describe('closePaginationOverlayAndRefresh', () => {
  it('closes and refreshes when no active type guard is required', () => {
    const events: string[] = []

    const result = closePaginationOverlayAndRefresh({
      activeEditorType: null,
      closeOverlay: () => {
        events.push('close-overlay')
      },
      refresh: () => {
        events.push('refresh')
        return true
      }
    })

    expect(result).toBe(true)
    expect(events).toEqual(['close-overlay', 'refresh'])
  })

  it('returns false when the required active editor type does not match', () => {
    const closeOverlay = jest.fn()
    const refresh = jest.fn()

    expect(
      closePaginationOverlayAndRefresh({
        activeEditorType: 'footer',
        requiredActiveEditorType: 'header',
        closeOverlay,
        refresh
      })
    ).toBe(false)

    expect(closeOverlay).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('updatePaginationOverlayAccentColor', () => {
  it('applies the accent color and refreshes overlay visuals', () => {
    const events: string[] = []

    const result = updatePaginationOverlayAccentColor({
      applyAccentColor: () => {
        events.push('apply-accent')
      },
      updateOverlayAccentColor: () => {
        events.push('update-overlay-accent')
      }
    })

    expect(result).toBe(true)
    expect(events).toEqual(['apply-accent', 'update-overlay-accent'])
  })
})
