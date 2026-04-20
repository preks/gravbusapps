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
