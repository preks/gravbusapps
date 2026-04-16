/**
 * Content Entry Payload Builder
 * Thin wrapper around buildPayload for the scalar block,
 * plus minimal post-processing for nullable fields, system fields,
 * and category/tag relation rows.
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { contentEntryFormFields } from '../types/contentEntryTypes'
import { ContentRole, ContentGroup } from '../constants/contentConstants'
import type {
  ContentEntryCategory,
  ContentEntryTag,
  BuildContentEntryPayloadParams,
  CategoryItem,
  ChangeMode,
  ContentEntryCategoryRow,
  ContentEntryDocumentRow,
  ContentEntryTagRow,
  ContentEntryPayloadOptions,
  DocumentItem,
  TagItem
} from '../types/contentEntryTypes'

export type { ContentEntryPayloadOptions }
export type { BuildContentEntryPayloadParams, CategoryItem, ChangeMode, DocumentItem, TagItem }

// =====================================================
// INTERNAL HELPERS
// =====================================================

function buildCategoryRows(
  contentCategoryIds: string[],
  contentCategoryNames: string[],
  existing: ContentEntryCategory[]
): ContentEntryCategoryRow[] {
  const byId = new Map<string, ContentEntryCategory>()
  existing.forEach(r => {
    if (r.contentCategoryId && !byId.has(r.contentCategoryId)) byId.set(r.contentCategoryId, r)
  })

  const categoryIdRows = [...new Set(contentCategoryIds.filter(Boolean))].map(contentCategoryId => {
    const existingRelation = byId.get(contentCategoryId)
    return {
      ...(existingRelation?.id ? { id: existingRelation.id, version: existingRelation.version } : {}),
      contentCategory: contentCategoryId
    }
  })

  const categoryNameRows = [...new Set(contentCategoryNames.filter(Boolean))].map(contentCategoryName => ({
    contentCategoryName
  }))

  return [...categoryIdRows, ...categoryNameRows]
}

function buildTagRows(
  contentTagIds: string[],
  contentTagNames: string[],
  existing: ContentEntryTag[]
): ContentEntryTagRow[] {
  const byId = new Map<string, ContentEntryTag>()
  existing.forEach(r => {
    if (r.contentTagId && !byId.has(r.contentTagId)) byId.set(r.contentTagId, r)
  })

  const tagIdRows = [...new Set(contentTagIds.filter(Boolean))].map(contentTagId => {
    const existingRelation = byId.get(contentTagId)
    return {
      ...(existingRelation?.id ? { id: existingRelation.id, version: existingRelation.version } : {}),
      contentTag: contentTagId
    }
  })

  const tagNameRows = [...new Set(contentTagNames.filter(Boolean))].map(contentTagName => ({
    contentTagName
  }))

  return [...tagIdRows, ...tagNameRows]
}

const mapCategoryItemsToRows = (items: CategoryItem[]): ContentEntryCategoryRow[] =>
  items.map(item => ({
    id: item.id,
    version: item.version,
    contentCategory: item.contentCategory,
    contentCategoryName: item.contentCategoryName
  }))

const mapTagItemsToRows = (items: TagItem[]): ContentEntryTagRow[] =>
  items.map(item => ({
    id: item.id,
    version: item.version,
    contentTag: item.contentTag,
    contentTagName: item.contentTagName
  }))

const mapDocumentItemsToRows = (items: DocumentItem[]): ContentEntryDocumentRow[] =>
  items.map(item => ({
    documentGroupRef: item.documentGroupRef,
    documentTypeRef: item.documentTypeRef,
    parentDocument: item.parentDocument,
    folder: item.folder,
    name: item.name,
    description: item.description,
    fileInfo: item.fileInfo
  }))

export const buildCreateContentEntryPayload = (params: BuildContentEntryPayloadParams) => {
  if (!params.creatorEmployeeId) {
    throw new Error('creatorEmployeeId is required for CREATE')
  }

  const payload: any = {
    contentEntry: {
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,
      pictureThumbnail: params.pictureThumbnail || null,
      role: params.role,
      contentGroup: params.contentGroup || null,
      contentType: params.contentTypeId || null,
      parentContentEntry: params.parentContentEntryId || null,
      rootContentEntry: params.rootContentEntryId || null,
      creatorEmployee: params.creatorEmployeeId,
      displayCreator: params.displayCreator ?? true,
      displayUpdater: params.displayUpdater ?? true,
      allowComment: params.allowComment ?? true,
      allowReaction: params.allowReaction ?? true,
      ...(params.timeToRead !== undefined && { timeToRead: params.timeToRead }),
      ...(params.activeFrom !== undefined && { activeFrom: params.activeFrom }),
      ...(params.activeTo !== undefined && { activeTo: params.activeTo }),
      ...(params.entryVersion !== undefined && { entryVersion: params.entryVersion })
    }
  }

  if (params.categories) {
    payload.contentEntry.contentEntryCategories = {
      changeMode: params.categories.changeMode,
      categories: mapCategoryItemsToRows(params.categories.items)
    }
  }

  if (params.documents) {
    payload.contentEntry.contentDocuments = {
      changeMode: params.documents.changeMode,
      documents: mapDocumentItemsToRows(params.documents.items)
    }
  }

  if (params.tags) {
    payload.contentEntry.contentEntryTags = {
      changeMode: params.tags.changeMode,
      tags: mapTagItemsToRows(params.tags.items)
    }
  }

  return payload
}

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
      id: params.id,
      version: params.version,
      title: params.title || null,
      preview: params.preview || null,
      content: params.content || null,
      picture: params.picture || null,
      pictureThumbnail: params.pictureThumbnail || null,
      role: params.role,
      contentGroup: params.contentGroup || null,
      contentType: params.contentTypeId || null,
      parentContentEntry: params.parentContentEntryId || null,
      rootContentEntry: params.rootContentEntryId || null,
      updaterEmployee: params.updaterEmployeeId,
      displayCreator: params.displayCreator ?? true,
      displayUpdater: params.displayUpdater ?? true,
      allowComment: params.allowComment ?? true,
      allowReaction: params.allowReaction ?? true,
      ...(params.timeToRead !== undefined && { timeToRead: params.timeToRead }),
      ...(params.activeFrom !== undefined && { activeFrom: params.activeFrom }),
      ...(params.activeTo !== undefined && { activeTo: params.activeTo }),
      ...(params.entryVersion !== undefined && { entryVersion: params.entryVersion })
    }
  }

  if (params.categories) {
    payload.contentEntry.contentEntryCategories = {
      changeMode: params.categories.changeMode,
      categories: mapCategoryItemsToRows(params.categories.items)
    }
  }

  if (params.documents) {
    payload.contentEntry.contentDocuments = {
      changeMode: params.documents.changeMode,
      documents: mapDocumentItemsToRows(params.documents.items)
    }
  }

  if (params.tags) {
    payload.contentEntry.contentEntryTags = {
      changeMode: params.tags.changeMode,
      tags: mapTagItemsToRows(params.tags.items)
    }
  }

  return payload
}

// =====================================================
// PAYLOAD BUILDER
// =====================================================

export interface ContentEntryFormData {
  id?: string
  version?: number
  title?: string
  preview?: string
  content?: string
  picture?: string | null
  pictureThumbnail?: string | null
  contentGroup?: string
  contentTypeId?: string
  role?: string
  displayCreator?: boolean
  allowComment?: boolean
  allowReaction?: boolean
  activeFrom?: string | Date | null
  activeTo?: string | Date | null
  contentCategoryIds?: string[]
  contentCategoryNames?: string[]
  contentTagIds?: string[]
  contentTagNames?: string[]
  [key: string]: any
}

/**
 * Builds the contentEntry request payload.
 *
 * Uses buildPayload with contentEntryFormFields for all scalar fields.
 * Post-processing covers:
 * - id/version: excluded for creates, included for updates
 * - nullable picture/thumbnail: explicit null to allow clearing
 * - nullable dates: explicit null to allow clearing
 * - system fields: role, employee reference, displayUpdater
 * - POLICY business rule: disable comments and reactions
 * - category/tag relation rows
 */
export const buildContentEntryPayload = (formData: ContentEntryFormData, options: ContentEntryPayloadOptions) => {
  const { employeeId, isUpdate, existingEntry, parentContentEntryId, rootContentEntryId } = options

  const contentEntry = buildPayload(formData, contentEntryFormFields)

  // For creates, buildPayload includes id/version from formData — remove them
  if (!isUpdate) {
    delete contentEntry.id
    delete contentEntry.version
  }

  // System fields
  contentEntry.role = ContentRole.ROOT
  contentEntry.displayUpdater = false
  if (isUpdate) {
    contentEntry.updaterEmployee = employeeId
  } else {
    contentEntry.creatorEmployee = employeeId
  }

  // Nullable fields: buildPayload omits null; set explicitly to allow clearing
  contentEntry.picture = formData.picture ?? null
  contentEntry.pictureThumbnail = formData.pictureThumbnail ?? null
  contentEntry.activeFrom = formData.activeFrom ?? null
  contentEntry.activeTo = formData.activeTo ?? null

  // POLICY: disable comments and reactions
  if (formData.contentGroup === ContentGroup.POLICY) {
    contentEntry.allowComment = false
    contentEntry.allowReaction = false
  }

  // Parent/root for comment thread entries
  if (parentContentEntryId) contentEntry.parentContentEntry = parentContentEntryId
  if (rootContentEntryId) contentEntry.rootContentEntry = rootContentEntryId

  // Category relation rows
  const categoryRows = buildCategoryRows(
    formData.contentCategoryIds || [],
    formData.contentCategoryNames || [],
    existingEntry?.contentEntryCategories || []
  )
  if (formData.contentCategoryIds !== undefined || formData.contentCategoryNames !== undefined) {
    contentEntry.contentEntryCategories = { changeMode: 'REPLACE', categories: categoryRows }
  }

  // Tag relation rows
  const tagRows = buildTagRows(
    formData.contentTagIds || [],
    formData.contentTagNames || [],
    existingEntry?.contentEntryTags || []
  )
  if (formData.contentTagIds !== undefined || formData.contentTagNames !== undefined) {
    contentEntry.contentEntryTags = { changeMode: 'REPLACE', tags: tagRows }
  }

  return { contentEntry }
}
