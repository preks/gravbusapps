/**
 * useDeskData Hook
 *
 * Fetches and combines data from all content creation apps:
 * Documents, Spreadsheets, and Notes.
 */

import { useState, useEffect, useMemo } from 'react'
import { DeskApiService } from '../services/DeskApiService'

/** Unified content item type */
export interface ContentItem {
  id: string
  type: 'document' | 'spreadsheet' | 'note' | 'slide'
  title: string
  updatedAt: string
  createdAt: string
  isShared?: boolean
  isOwner?: boolean
  isPdf?: boolean // For PDF documents
}

/** Statistics for each app */
export interface DeskStats {
  documents: {
    total: number
    shared: number
  }
  spreadsheets: {
    total: number
    shared: number
  }
  notes: {
    total: number
    shared: number
  }
  slides: {
    total: number
    shared: number
  }
  totalItems: number
}

/** Activity data point for charts */
export interface ActivityDataPoint {
  day: string
  documents: number
  spreadsheets: number
  notes: number
  slides: number
}

/** Return type for useDeskData */
export interface UseDeskDataReturn {
  /** All documents */
  documents: ContentItem[]
  /** All spreadsheets */
  spreadsheets: ContentItem[]
  /** All notes */
  notes: ContentItem[]
  /** All slide decks */
  slides: ContentItem[]
  /** Combined recent items sorted by updatedAt */
  recentItems: ContentItem[]
  /** Whether any data is loading */
  isLoading: boolean
  /** Statistics for dashboard display */
  stats: DeskStats
  /** Activity data for the last 7 days */
  activityData: ActivityDataPoint[]
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[date.getDay()]
}

/**
 * useDeskData Hook
 *
 * Fetches and combines data from all content creation apps.
 */
export function useDeskData(accessToken: string | undefined, userId: string): UseDeskDataReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState<ContentItem[]>([])
  const [stats, setStats] = useState<DeskStats>({
    documents: { total: 0, shared: 0 },
    spreadsheets: { total: 0, shared: 0 },
    notes: { total: 0, shared: 0 },
    slides: { total: 0, shared: 0 },
    totalItems: 0
  })

  // This hook previously used userId for ownership logic. Keep the signature stable.
  void userId

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!accessToken) {
        if (!cancelled) {
          setIsLoading(false)
          setError('Not authenticated')
          setRecentItems([])
        }
        return
      }

      try {
        if (!cancelled) {
          setIsLoading(true)
          setError(null)
        }

        const overview = await DeskApiService.getOverview(accessToken, { limit: 20 })

        if (cancelled) return

        setStats({
          documents: overview.counts.documents,
          spreadsheets: overview.counts.spreadsheets,
          notes: overview.counts.notes,
          slides: overview.counts.slides,
          totalItems: overview.counts.totalItems
        })

        setRecentItems(
          overview.recentItems.map(item => ({
            id: item.id,
            type: item.type,
            title:
              item.title ??
              (item.type === 'document'
                ? 'Untitled Document'
                : item.type === 'spreadsheet'
                  ? 'Untitled Spreadsheet'
                  : item.type === 'note'
                    ? 'Untitled Note'
                    : 'Untitled presentation'),
            updatedAt: item.updatedAt,
            createdAt: item.createdAt,
            isShared: item.isShared,
            isOwner: item.isOwner,
            isPdf: item.isPdf
          }))
        )
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load desk data'
        if (!cancelled) {
          console.error('[useDeskData] Failed to load overview:', message)
          setError(message)
          setRecentItems([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  // For legacy compatibility, expose per-type lists as subsets of the recent items.
  const documents = useMemo(() => recentItems.filter(i => i.type === 'document'), [recentItems])
  const spreadsheets = useMemo(() => recentItems.filter(i => i.type === 'spreadsheet'), [recentItems])
  const notes = useMemo(() => recentItems.filter(i => i.type === 'note'), [recentItems])
  const slides = useMemo(() => recentItems.filter(i => i.type === 'slide'), [recentItems])

  // Combine and sort recent items
  const recentItemsSorted: ContentItem[] = useMemo(() => {
    return [...recentItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [recentItems])

  // Generate activity data for the last 7 days
  const activityData: ActivityDataPoint[] = useMemo(() => {
    const now = new Date()
    const last7Days: ActivityDataPoint[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const docsCount = recentItemsSorted
        .filter(d => d.type === 'document')
        .filter(d => {
          const updated = new Date(d.updatedAt)
          return updated >= dayStart && updated <= dayEnd
        }).length

      const sheetsCount = recentItemsSorted
        .filter(s => s.type === 'spreadsheet')
        .filter(s => {
          const updated = new Date(s.updatedAt)
          return updated >= dayStart && updated <= dayEnd
        }).length

      const notesCount = recentItemsSorted
        .filter(n => n.type === 'note')
        .filter(n => {
          const updated = new Date(n.updatedAt)
          return updated >= dayStart && updated <= dayEnd
        }).length

      const slidesCount = recentItemsSorted
        .filter(s => s.type === 'slide')
        .filter(s => {
          const updated = new Date(s.updatedAt)
          return updated >= dayStart && updated <= dayEnd
        }).length

      last7Days.push({
        day: getDayName(dayStart),
        documents: docsCount,
        spreadsheets: sheetsCount,
        notes: notesCount,
        slides: slidesCount
      })
    }

    return last7Days
  }, [recentItemsSorted])

  return {
    documents,
    spreadsheets,
    notes,
    slides,
    recentItems: recentItemsSorted.slice(0, 20),
    isLoading,
    stats,
    activityData
  }
}

export default useDeskData
