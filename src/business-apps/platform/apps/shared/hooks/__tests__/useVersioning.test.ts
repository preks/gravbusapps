import { markVersioningStateAsChanged } from '../useVersioning'

describe('useVersioning', () => {
  it('reuses the existing state object when content is already dirty', () => {
    const dirtyState = {
      versions: [],
      currentVersion: undefined,
      isLoading: false,
      isSaving: false,
      isRestoring: false,
      error: null,
      hasUnsavedChanges: true,
      lastSaveTime: null
    }

    expect(markVersioningStateAsChanged(dirtyState)).toBe(dirtyState)
  })

  it('marks clean state as dirty without changing unrelated fields', () => {
    const cleanState = {
      versions: [],
      currentVersion: undefined,
      isLoading: false,
      isSaving: false,
      isRestoring: false,
      error: null,
      hasUnsavedChanges: false,
      lastSaveTime: null
    }

    expect(markVersioningStateAsChanged(cleanState)).toEqual({
      ...cleanState,
      hasUnsavedChanges: true
    })
  })
})
