import { act, renderHook, waitFor } from '@testing-library/react'
import { useSpreadsheetAppsHubUrlState } from '../useSpreadsheetAppsHubUrlState'

describe('useSpreadsheetAppsHubUrlState', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/platform/apps/spreadsheet-apps')
  })

  it('persists non-default sections in URL', () => {
    const { result } = renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById: async () => null,
        setSelectedAppId: () => undefined,
        setCurrentView: () => undefined,
        activeSection: 'automations',
        setActiveSection: () => undefined
      })
    )

    act(() => {
      result.current.updateUrl(null)
    })

    expect(window.location.search).toContain('section=automations')
  })

  it('removes section from URL for default my-files', () => {
    const { result } = renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById: async () => null,
        setSelectedAppId: () => undefined,
        setCurrentView: () => undefined,
        activeSection: 'my-files',
        setActiveSection: () => undefined
      })
    )

    act(() => {
      result.current.updateUrl(null)
    })

    expect(window.location.search).toBe('')
  })

  it('restores section from URL on mount', () => {
    const setActiveSection = jest.fn()
    window.history.pushState({}, '', '/platform/apps/spreadsheet-apps?section=tasks')

    renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById: async () => null,
        setSelectedAppId: () => undefined,
        setCurrentView: () => undefined,
        activeSection: 'my-files',
        setActiveSection
      })
    )

    expect(setActiveSection).toHaveBeenCalledWith('tasks')
  })

  it('falls back to my-files when URL restores shared while the tab is hidden', () => {
    const setActiveSection = jest.fn()
    window.history.pushState({}, '', '/platform/apps/spreadsheet-apps?section=shared')

    renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById: async () => null,
        setSelectedAppId: () => undefined,
        setCurrentView: () => undefined,
        activeSection: 'recent',
        setActiveSection,
        showSharedSection: false
      })
    )

    expect(setActiveSection).toHaveBeenCalledWith('my-files')
  })

  it('does not persist shared section in URL when the tab is hidden', () => {
    const { result } = renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById: async () => null,
        setSelectedAppId: () => undefined,
        setCurrentView: () => undefined,
        activeSection: 'shared',
        setActiveSection: () => undefined,
        showSharedSection: false
      })
    )

    act(() => {
      result.current.updateUrl(null)
    })

    expect(window.location.search).toBe('')
  })

  it('does not restore the previous URL section after the user switches tabs', () => {
    const setActiveSection = jest.fn()
    window.history.pushState({}, '', '/platform/apps/spreadsheet-apps?section=favorites')

    const { rerender } = renderHook(
      ({ activeSection }) =>
        useSpreadsheetAppsHubUrlState({
          currentView: 'list',
          currentAppId: null,
          isLoadingApps: false,
          loadAppById: async () => null,
          setSelectedAppId: () => undefined,
          setCurrentView: () => undefined,
          activeSection,
          setActiveSection
        }),
      {
        initialProps: {
          activeSection: 'my-files' as const
        }
      }
    )

    expect(setActiveSection).toHaveBeenCalledWith('favorites')

    setActiveSection.mockClear()

    rerender({ activeSection: 'tasks' })

    expect(setActiveSection).not.toHaveBeenCalled()
  })

  it('loads trashed app previews from URL when trash view is requested', async () => {
    const loadAppById = jest.fn().mockResolvedValue({ id: 'app-1' })
    const setSelectedAppId = jest.fn()
    const setCurrentView = jest.fn()
    window.history.pushState({}, '', '/platform/apps/spreadsheet-apps?appId=app-1&view=trash')

    renderHook(() =>
      useSpreadsheetAppsHubUrlState({
        currentView: 'list',
        currentAppId: null,
        isLoadingApps: false,
        loadAppById,
        setSelectedAppId,
        setCurrentView,
        activeSection: 'trash',
        setActiveSection: () => undefined
      })
    )

    await waitFor(() => {
      expect(loadAppById).toHaveBeenCalledWith('app-1', undefined, { allowTrashed: true })
    })

    expect(setSelectedAppId).toHaveBeenCalledWith('app-1')
    expect(setCurrentView).toHaveBeenCalledWith('trash')
  })
})
