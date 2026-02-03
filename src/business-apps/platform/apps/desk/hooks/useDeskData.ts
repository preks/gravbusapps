/**
 * useDeskData Hook
 *
 * Fetches and combines data from all content creation apps:
 * Documents, Spreadsheets, and Notes.
 */

import { useState, useEffect, useMemo } from 'react'
import { useDocumentApps } from '../../document-apps/hooks/useDocumentApps'
import { useSpreadsheetApps } from '../../spreadsheet-apps/hooks/useSpreadsheetApps'
import { useNotes } from '../../note-apps/hooks/useNotes'
import { useSlides } from '../../slide-apps/hooks/useSlides'

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
  const [isInitialized, setIsInitialized] = useState(false)

  // Fetch data from each app
  const { documents: rawDocuments, isLoading: isLoadingDocuments } = useDocumentApps(accessToken, userId)

  const { apps: rawSpreadsheets, isLoading: isLoadingSpreadsheets } = useSpreadsheetApps(accessToken, userId)

  const { notes: rawNotes, isLoading: isLoadingNotes } = useNotes({ accessToken, userId })

  const { slides: rawSlides, isLoading: isLoadingSlides } = useSlides(accessToken, userId)

  // Mark as initialized after first load
  useEffect(() => {
    if (!isLoadingDocuments && !isLoadingSpreadsheets && !isLoadingNotes && !isLoadingSlides && !isInitialized) {
      setIsInitialized(true)
    }
  }, [isLoadingDocuments, isLoadingSpreadsheets, isLoadingNotes, isLoadingSlides, isInitialized])

  // Transform documents to ContentItem format
  const documents: ContentItem[] = useMemo(() => {
    return rawDocuments.map(doc => ({
      id: doc.id,
      type: 'document' as const,
      title: doc.title || 'Untitled Document',
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      isShared: doc.isShared,
      isOwner: doc.isOwner,
      isPdf: doc.isPdf
    }))
  }, [rawDocuments])

  // Transform spreadsheets to ContentItem format
  const spreadsheets: ContentItem[] = useMemo(() => {
    return rawSpreadsheets.map(app => ({
      id: app.id,
      type: 'spreadsheet' as const,
      title: app.name || 'Untitled Spreadsheet',
      updatedAt: app.updatedAt,
      createdAt: app.createdAt,
      isShared: app.isShared,
      isOwner: app.isOwner
    }))
  }, [rawSpreadsheets])

  // Transform notes to ContentItem format
  const notes: ContentItem[] = useMemo(() => {
    return rawNotes.map(note => ({
      id: note.id,
      type: 'note' as const,
      title: note.title || 'Untitled Note',
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
      isShared: note.isShared,
      isOwner: note.ownerId === userId
    }))
  }, [rawNotes, userId])

  // Transform slides to ContentItem format
  const slides: ContentItem[] = useMemo(() => {
    return rawSlides.map(slide => ({
      id: slide.id,
      type: 'slide' as const,
      title: slide.title || 'Untitled presentation',
      updatedAt: slide.updatedAt,
      createdAt: slide.createdAt,
      isShared: slide.isShared,
      isOwner: slide.createdBy === userId || slide.permission === 'owner' || slide.permission === 'admin'
    }))
  }, [rawSlides, userId])

  // Combine and sort recent items
  const recentItems: ContentItem[] = useMemo(() => {
    const allItems = [...documents, ...spreadsheets, ...notes, ...slides]
    return allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10)
  }, [documents, spreadsheets, notes, slides])

  // Calculate stats
  const stats: DeskStats = useMemo(
    () => ({
      documents: {
        total: documents.length,
        shared: documents.filter(d => d.isShared && !d.isOwner).length
      },
      spreadsheets: {
        total: spreadsheets.length,
        shared: spreadsheets.filter(s => s.isShared && !s.isOwner).length
      },
      notes: {
        total: notes.length,
        shared: notes.filter(n => n.isShared && !n.isOwner).length
      },
      slides: {
        total: slides.length,
        shared: slides.filter(s => s.isShared && !s.isOwner).length
      },
      totalItems: documents.length + spreadsheets.length + notes.length + slides.length
    }),
    [documents, spreadsheets, notes, slides]
  )

  // Generate activity data for the last 7 days
  const activityData: ActivityDataPoint[] = useMemo(() => {
    const now = new Date()
    const last7Days: ActivityDataPoint[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const docsCount = documents.filter(d => {
        const updated = new Date(d.updatedAt)
        return updated >= dayStart && updated <= dayEnd
      }).length

      const sheetsCount = spreadsheets.filter(s => {
        const updated = new Date(s.updatedAt)
        return updated >= dayStart && updated <= dayEnd
      }).length

      const notesCount = notes.filter(n => {
        const updated = new Date(n.updatedAt)
        return updated >= dayStart && updated <= dayEnd
      }).length

      const slidesCount = slides.filter(s => {
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
  }, [documents, spreadsheets, notes, slides])

  // Combined loading state
  const isLoading = !isInitialized && (isLoadingDocuments || isLoadingSpreadsheets || isLoadingNotes || isLoadingSlides)

  return {
    documents,
    spreadsheets,
    notes,
    slides,
    recentItems,
    isLoading,
    stats,
    activityData
  }
}

export default useDeskData
