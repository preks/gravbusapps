/**
 * Content Entry Payload Builder
 * Centralized payload construction for ContentEntry operations
 */
import { ContentRole } from '../types/contentEnums'

export interface BuildContentEntryPayloadParams {
  // Core fields
  title?: string
  preview?: string
  content?: string
  picture?: string | null

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
}

/**
 * Build payload for creating a new ContentEntry
 */
export const buildCreateContentEntryPayload = (params: BuildContentEntryPayloadParams) => {
  if (!params.creatorEmployeeId) {
    throw new Error('creatorEmployeeId is required for CREATE')
  }

  return {
    contentEntry: {
      // Core fields
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,

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

  return {
    contentEntry: {
      // Identity
      id: params.id,
      version: params.version,

      // Core fields
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,

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
