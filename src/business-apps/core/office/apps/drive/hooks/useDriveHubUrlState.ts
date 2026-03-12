import { useState, useEffect, useCallback } from 'react'
import type { DriveSection, DriveViewMode, DriveSortBy } from '../types/drive.types'

interface DriveHubUrlState {
  section: DriveSection
  folderId: string | null
  viewMode: DriveViewMode
  sortBy: DriveSortBy
  page: number
}

export function useDriveHubUrlState(): [DriveHubUrlState, (updates: Partial<DriveHubUrlState>) => void] {
  const readFromUrl = (): DriveHubUrlState => {
    if (typeof window === 'undefined') {
      return { section: 'my-drive', folderId: null, viewMode: 'list', sortBy: 'updatedAt', page: 1 }
    }
    const params = new URLSearchParams(window.location.search)
    return {
      section: (params.get('section') as DriveSection) ?? 'my-drive',
      folderId: params.get('folderId') ?? null,
      viewMode: (params.get('viewMode') as DriveViewMode) ?? 'list',
      sortBy: (params.get('sortBy') as DriveSortBy) ?? 'updatedAt',
      page: parseInt(params.get('page') ?? '1', 10) || 1
    }
  }

  const [state, setState] = useState<DriveHubUrlState>(readFromUrl)

  const updateState = useCallback((updates: Partial<DriveHubUrlState>) => {
    setState(prev => {
      const next = { ...prev, ...updates }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (next.section !== 'my-drive') params.set('section', next.section)
        else params.delete('section')
        if (next.folderId) params.set('folderId', next.folderId)
        else params.delete('folderId')
        if (next.viewMode !== 'list') params.set('viewMode', next.viewMode)
        else params.delete('viewMode')
        if (next.sortBy !== 'updatedAt') params.set('sortBy', next.sortBy)
        else params.delete('sortBy')
        if (next.page > 1) params.set('page', String(next.page))
        else params.delete('page')
        const qs = params.toString()
        const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`
        window.history.replaceState(null, '', newUrl)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const handler = () => setState(readFromUrl())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return [state, updateState]
}
