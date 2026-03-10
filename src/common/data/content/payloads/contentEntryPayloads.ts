/**
 * Content Entry Payload Builder
 * Centralized payload construction for ContentEntry operations
 */
import { ContentRole } from '../types/contentEnums'

export type ChangeMode = 'UPSERT' | 'REPLACE'

export interface CategoryItem {
  contentCategoryRef?: string
}

export interface DocumentItem {
  documentGroupRef?: string
  documentTypeRef?: string
  parentDocument?: string | null
  folder?: boolean
  name?: string
  description?: string | null
  fileInfo?: any
}

export interface TagItem {
  contentTagRef?: string
}

export interface BuildContentEntryPayloadParams {
  // Core fields
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  pictureThumbnail?: string | null

  // Metadata
  role: ContentRole
  contentGroupRef?: string | null
  contentTypeRef?: string | null

  // Relations
  parentContentEntryId?: string | null // Direct parent (article or parent comment)
  rootContentEntryId?: string | null // Always the root article (for nested comments)

  // Employee relations
  creatorEmployeeId?: string
  updaterEmployeeId?: string

  // Settings
  displayCreator?: boolean
  displayUpdater?: boolean
  allowComment?: boolean
  allowReaction?: boolean

  // Optional fields
  timeToRead?: number | null
  activeFrom?: string | Date | null
  activeTo?: string | Date | null
  entryVersion?: string | null

  // Update-specific fields
  id?: string
  version?: number

  // Bulk Operations
  categories?: {
    changeMode: ChangeMode
    items: CategoryItem[]
  }
  documents?: {
    changeMode: ChangeMode
    items: DocumentItem[]
  }
  tags?: {
    changeMode: ChangeMode
    items: TagItem[]
  }
}

/**
 * Build payload for creating a new ContentEntry
 */
export const buildCreateContentEntryPayload = (params: BuildContentEntryPayloadParams) => {
  if (!params.creatorEmployeeId) {
    throw new Error('creatorEmployeeId is required for CREATE')
  }

  const payload: any = {
    contentEntry: {
      // Core fields
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,
      pictureThumbnail: params.pictureThumbnail || null,

      // Metadata
      role: params.role,
      contentGroupRef: params.contentGroupRef || null,
      contentTypeRef: params.contentTypeRef || null,

      // Relations (for comments)
      parentContentEntry: params.parentContentEntryId || null,
      rootContentEntry: params.rootContentEntryId || null,

      // Creator
      creatorEmployee: params.creatorEmployeeId,

      // Settings
      displayCreator: params.displayCreator ?? true,
      displayUpdater: params.displayUpdater ?? true,
      allowComment: params.allowComment ?? true,
      allowReaction: params.allowReaction ?? true,

      // Optional fields
      ...(params.timeToRead !== undefined && { timeToRead: params.timeToRead }),
      ...(params.activeFrom && { activeFrom: params.activeFrom }),
      ...(params.activeTo && { activeTo: params.activeTo }),
      ...(params.entryVersion && { entryVersion: params.entryVersion })
    }
  }

  // Add bulk operations if provided
  if (params.categories) {
    payload.contentEntry.contentEntryCategories = {
      changeMode: params.categories.changeMode,
      categories: params.categories.items
    }
  }

  if (params.documents) {
    payload.contentEntry.contentDocuments = {
      changeMode: params.documents.changeMode,
      documents: params.documents.items
    }
  }

  if (params.tags) {
    payload.contentEntry.contentEntryTags = {
      changeMode: params.tags.changeMode,
      tags: params.tags.items
    }
  }

  return payload
}

/**
 * Build payload for updating an existing ContentEntry
 */
export const buildUpdateContentEntryPayload = (params: BuildContentEntryPayloadParams) => {
  if (!params.id) {
    throw new Error('id is required for UPDATE')
  }
  if (params.version === undefined || params.version === null) {
    throw new Error('version is required for UPDATE')
  }
  if (!params.updaterEmployeeId) {
    throw new Error('updaterEmployeeId is required for UPDATE')
  }

  const payload: any = {
    contentEntry: {
      // Identity
      id: params.id,
      version: params.version,

      // Core fields
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,
      pictureThumbnail: params.pictureThumbnail || null,

      // Metadata
      role: params.role,
      contentGroupRef: params.contentGroupRef || null,
      contentTypeRef: params.contentTypeRef || null,

      // Relations (for comments)
      parentContentEntry: params.parentContentEntryId || null,
      rootContentEntry: params.rootContentEntryId || null,

      // Updater
      updaterEmployee: params.updaterEmployeeId,

      // Settings
      displayCreator: params.displayCreator ?? true,
      displayUpdater: params.displayUpdater ?? true,
      allowComment: params.allowComment ?? true,
      allowReaction: params.allowReaction ?? true,

      // Optional fields
      ...(params.timeToRead !== undefined && { timeToRead: params.timeToRead }),
      ...(params.activeFrom && { activeFrom: params.activeFrom }),
      ...(params.activeTo && { activeTo: params.activeTo }),
      ...(params.entryVersion && { entryVersion: params.entryVersion })
    }
  }

  // Add bulk operations if provided
  if (params.categories) {
    payload.contentEntry.contentEntryCategories = {
      changeMode: params.categories.changeMode,
      categories: params.categories.items
    }
  }

  if (params.documents) {
    payload.contentEntry.contentDocuments = {
      changeMode: params.documents.changeMode,
      documents: params.documents.items
    }
  }

  if (params.tags) {
    payload.contentEntry.contentEntryTags = {
      changeMode: params.tags.changeMode,
      tags: params.tags.items
    }
  }

  return payload
}

/**
 * Build payload for ContentEntry operations (auto-detects CREATE vs UPDATE)
 */
export const buildContentEntryPayload = (params: BuildContentEntryPayloadParams) => {
  if (params.id && params.version !== undefined && params.version !== null) {
    return buildUpdateContentEntryPayload(params)
  }
  return buildCreateContentEntryPayload(params)
}
