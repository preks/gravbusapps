import { useState, useEffect, useCallback } from 'react'
import type { DriveSection, DriveViewMode, DriveSortBy } from '../types/drive.types'

const DRIVE_ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/

interface DriveHubUrlState {
  section: DriveSection
  folderId: string | null
  viewMode: DriveViewMode
  sortBy: DriveSortBy
  page: number
}

const parseDriveSection = (value: string | null): DriveSection => {
  switch (value) {
    case 'shared':
      return 'shared'
    case 'recent':
      return 'recent'
    case 'favorites':
      return 'favorites'
    case 'trash':
      return 'trash'
    default:
      return 'my-drive'
  }
}

const parseDriveViewMode = (value: string | null): DriveViewMode => {
  switch (value) {
    case 'grid':
      return 'grid'
    default:
      return 'list'
  }
}

const parseDriveSortBy = (value: string | null): DriveSortBy => {
  switch (value) {
    case 'name':
      return 'name'
    case 'createdAt':
      return 'createdAt'
    case 'size':
      return 'size'
    default:
      return 'updatedAt'
  }
}

const sanitizeFolderId = (value: string | null): string | null => (value && DRIVE_ID_PATTERN.test(value) ? value : null)

const sanitizePage = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function useDriveHubUrlState(): [DriveHubUrlState, (updates: Partial<DriveHubUrlState>) => void] {
  const readFromUrl = (): DriveHubUrlState => {
    if (typeof window === 'undefined') {
      return { section: 'my-drive', folderId: null, viewMode: 'list', sortBy: 'updatedAt', page: 1 }
    }
    const params = new URLSearchParams(window.location.search)
    return {
      section: parseDriveSection(params.get('section')),
      folderId: sanitizeFolderId(params.get('folderId')),
      viewMode: parseDriveViewMode(params.get('viewMode')),
      sortBy: parseDriveSortBy(params.get('sortBy')),
      page: sanitizePage(params.get('page'))
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
