/**
 * 2a: backend row UUID predicate unification.
 *
 * Ensures resolve and emit see the same predicate decision, even when hosts in transition
 * provide both the new `isBackendRowUuid` and the deprecated `isUuidForRowRemap` slots.
 */
import {
  __resetBackendRowUuidPredicateWarningForTests,
  resolveBackendRowUuidPredicate,
  resolveBackendRowUuidPredicateFromGridProps
} from '../univerBackendRowUuidPredicate'

describe('resolveBackendRowUuidPredicate', () => {
  beforeEach(() => {
    __resetBackendRowUuidPredicateWarningForTests()
  })

  it('returns the default predicate when no slots are wired', () => {
    const predicate = resolveBackendRowUuidPredicate({})
    expect(typeof predicate).toBe('function')
    // The default `isSpreadsheetBackendRowUuid` rejects obvious non-UUID inputs.
    expect(predicate('client_row_0')).toBe(false)
  })

  it('prefers isBackendRowUuid when only the new slot is wired', () => {
    const predicate = resolveBackendRowUuidPredicate({
      isBackendRowUuid: value => value === 'BACKEND'
    })
    expect(predicate('BACKEND')).toBe(true)
    expect(predicate('OTHER')).toBe(false)
  })

  it('falls back to the deprecated isUuidForRowRemap when only the legacy slot is wired', () => {
    const predicate = resolveBackendRowUuidPredicate({
      isUuidForRowRemap: value => value === 'LEGACY'
    })
    expect(predicate('LEGACY')).toBe(true)
    expect(predicate('OTHER')).toBe(false)
  })

  it('prefers the new slot and warns once when both are provided and differ', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const predicate = resolveBackendRowUuidPredicate({
        isBackendRowUuid: value => value === 'NEW',
        isUuidForRowRemap: value => value === 'LEGACY'
      })
      expect(predicate('NEW')).toBe(true)
      expect(predicate('LEGACY')).toBe(false)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      // Second resolve must NOT re-warn.
      resolveBackendRowUuidPredicate({
        isBackendRowUuid: value => value === 'NEW',
        isUuidForRowRemap: value => value === 'LEGACY'
      })
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('does not warn when the new and legacy slots are referentially equal', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const shared = (value: string): boolean => value === 'SHARED'
      const predicate = resolveBackendRowUuidPredicate({
        isBackendRowUuid: shared,
        isUuidForRowRemap: shared
      })
      expect(predicate('SHARED')).toBe(true)
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('resolveBackendRowUuidPredicateFromGridProps', () => {
  beforeEach(() => {
    __resetBackendRowUuidPredicateWarningForTests()
  })

  it('reads predicate slots from propsRef.current', () => {
    const propsRef = {
      current: {
        isUuidForRowRemap: (value: string) => value === 'FROM_PROPS'
      }
    }
    const predicate = resolveBackendRowUuidPredicateFromGridProps(propsRef)
    expect(predicate('FROM_PROPS')).toBe(true)
    expect(predicate('OTHER')).toBe(false)
  })
})
