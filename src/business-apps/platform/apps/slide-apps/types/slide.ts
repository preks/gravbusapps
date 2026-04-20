/**
 * Slide Apps - TypeScript type definitions
 *
 * Core types for slide decks (presentations) synced with document-service slides API.
 */

/**
 * Slide status
 */
export type SlideStatus = 'draft' | 'saved' | 'archived'

/**
 * Permission for shared slides (matches backend SharePermission)
 */
export type SlidePermission = 'view' | 'comment' | 'edit' | 'owner' | 'admin'

/**
 * Slide deck summary (list view)
 */
export interface SlideSummary {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  currentVersion?: number
  status?: SlideStatus
  isShared?: boolean
  sharedBy?: string
  permission?: SlidePermission
  isOwner?: boolean
  spaceId?: string | null
  trashedAt?: string | null
}

/**
 * Full slide deck (editor / detail)
 */
export interface Slide {
  id: string
  title: string
  description?: string
  content?: string
  contentJson?: Record<string, unknown>
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  createdBy: string
  version?: number
  currentVersion?: number
  status?: SlideStatus
  isShared?: boolean
  sharedBy?: string
  permission?: SlidePermission
  isOwner?: boolean
  spaceId?: string | null
  trashedAt?: string | null
}
