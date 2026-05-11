import { readInitialSectionFromUrl } from '../utils/readInitialSectionFromUrl'

describe('DocumentAppsHub initial section', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/platform/every-office/documents')
  })

  it('reads favorites from the URL before the first render', () => {
    window.history.replaceState({}, '', '/platform/every-office/documents?section=favorites')

    expect(readInitialSectionFromUrl()).toBe('favorites')
  })

  it('falls back to my-documents for unknown sections', () => {
    window.history.replaceState({}, '', '/platform/every-office/documents?section=unknown')

    expect(readInitialSectionFromUrl()).toBe('my-documents')
  })
})
