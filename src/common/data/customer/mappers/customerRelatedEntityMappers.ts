// Customer Related Entity Mappers - Transform base types to enhanced types with computed fields

import {
  BaseCustomerTask,
  BaseCustomerActivity,
  BaseCustomerNote,
  BaseCustomerDocument,
  CustomerTask,
  CustomerActivity,
  CustomerNote,
  CustomerDocument
} from '../types'

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * Helper to create mock CatalogEntry from ref string
 * Converts "SalesTaskPriority:v1:HIGH" to { id: "...", type: "HIGH", value: "High", code: "HIGH" }
 */
const createCatalogEntryFromRef = (ref: string | undefined): CatalogEntry | undefined => {
  if (!ref) return undefined

  // Split by ":" and get last part (the type/code)
  const parts = ref.split(':')
  const type = parts[parts.length - 1] || ref

  // Convert SCREAMING_SNAKE_CASE to Title Case for value
  const value = type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return {
    id: ref,
    code: type,
    type: type,
    value: value
  } as CatalogEntry
}

/**
 * Transform BaseCustomerTask (GraphQL response) to CustomerTask (enhanced with computed fields)
 */
export function toCustomerTask(base: BaseCustomerTask): CustomerTask {
  // Extract labels from catalog entries
  const taskTypeLabel = base.type?.value || base.type?.code || (base as any).typeRef || undefined
  const taskPriorityLabel = base.priority?.value || base.priority?.code || (base as any).priorityRef || undefined
  const taskStatusLabel = base.status?.value || base.status?.code || (base as any).statusRef || undefined

  // Employee display names
  const creatorDisplayName =
    base.creatorEmployee?.displayName ||
    `${base.creatorEmployee?.firstName || ''} ${base.creatorEmployee?.lastName || ''}`.trim()
  const assignedDisplayName =
    base.assignedEmployee?.displayName ||
    `${base.assignedEmployee?.firstName || ''} ${base.assignedEmployee?.lastName || ''}`.trim()

  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code
  const contactDisplayName =
    base.contact?.fullName || `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim()
  const leadDisplayName =
    base.lead?.firstName && base.lead?.lastName ? `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code

  // Create computed display name
  const displayName = base.name || base.code || `Task ${base.id}`

  // Format dates
  const formattedDueDate = base.dueDate ? new Date(base.dueDate).toLocaleDateString() : undefined
  const formattedStartDate = base.startDate ? new Date(base.startDate).toLocaleDateString() : undefined
  const formattedEndDate = base.endDate ? new Date(base.endDate).toLocaleDateString() : undefined

  // Build task reference from related entities
  let taskReference: any = undefined
  if (base.opportunity?.id) {
    taskReference = { type: 'opportunity', id: base.opportunity.id, name: opportunityDisplayName }
  } else if (base.account?.id) {
    taskReference = { type: 'account', id: base.account.id, name: accountDisplayName }
  } else if (base.lead?.id) {
    taskReference = { type: 'lead', id: base.lead.id, name: leadDisplayName }
  } else if (base.contact?.id) {
    taskReference = { type: 'contact', id: base.contact.id, name: contactDisplayName }
  }

  // Convert string refs to CatalogEntry objects
  const taskType = createCatalogEntryFromRef((base as any).typeRef)
  const taskPriority = createCatalogEntryFromRef((base as any).priorityRef)
  const taskStatus = createCatalogEntryFromRef((base as any).statusRef)

  return {
    ...base,
    taskType, // Override base.taskType with converted CatalogEntry
    taskPriority, // Override base.taskPriority with converted CatalogEntry
    taskStatus, // Override base.taskStatus with converted CatalogEntry
    displayName,
    creatorDisplayName,
    assignedDisplayName,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName,
    formattedDueDate,
    formattedStartDate,
    formattedEndDate,
    reference: taskReference
  }
}

/**
 * Transform BaseCustomerActivity (GraphQL response) to CustomerActivity (enhanced with computed fields)
 */
export function toCustomerActivity(base: BaseCustomerActivity): CustomerActivity {
  // Extract labels from catalog entries
  const activityTypeLabel = base.activityType?.value || base.activityType?.code

  // Employee display names
  const ownerDisplayName =
    base.ownerEmployee?.displayName ||
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim()

  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code
  const contactDisplayName =
    base.contact?.fullName || `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim()
  const leadDisplayName =
    base.lead?.firstName && base.lead?.lastName ? `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code

  // Create computed display name
  const displayName = base.title || `Activity ${base.id}`

  // Format dates
  const formattedOccurredAt = base.occurredAt ? new Date(base.occurredAt).toLocaleDateString() : undefined
  const formattedCompletedAt = base.completedAt ? new Date(base.completedAt).toLocaleDateString() : undefined

  return {
    ...base,
    displayName,
    activityTypeLabel,
    ownerDisplayName,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName,
    formattedOccurredAt,
    formattedCompletedAt
  }
}

/**
 * Transform BaseCustomerNote (GraphQL response) to CustomerNote (enhanced with computed fields)
 */
export function toCustomerNote(base: BaseCustomerNote): CustomerNote {
  // Employee display names
  const authorDisplayName =
    base.authorEmployee?.displayName ||
    `${base.authorEmployee?.firstName || ''} ${base.authorEmployee?.lastName || ''}`.trim()

  // Create computed display name
  const displayName = base.title || `Note ${base.id}`

  // Format dates
  const formattedReminderDate = base.reminderDate ? new Date(base.reminderDate).toLocaleDateString() : undefined

  return {
    ...base,
    displayName,
    authorDisplayName,
    formattedReminderDate
  }
}

/**
 * Transform BaseCustomerDocument (GraphQL response) to CustomerDocument (enhanced with computed fields)
 */
export function toCustomerDocument(base: BaseCustomerDocument): CustomerDocument {
  // Extract labels from catalog entries
  const documentGroupLabel = base.documentGroup?.value || base.documentGroup?.code
  const documentTypeLabel = base.documentType?.value || base.documentType?.code

  // Create computed display name
  const displayName = base.name || `Document ${base.id}`

  // Format file size
  const formattedFileSize = base.fileSize ? formatFileSize(base.fileSize) : undefined

  // Format expiration date and check expiration status
  const formattedExpirationDate = base.expirationDate ? new Date(base.expirationDate).toLocaleDateString() : undefined
  const now = new Date()
  const expirationDate = base.expirationDate ? new Date(base.expirationDate) : null
  const isExpired = expirationDate ? expirationDate < now : false
  const isExpiringSoon = expirationDate
    ? expirationDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000 && !isExpired
    : false // 30 days

  return {
    ...base,
    displayName,
    documentGroupLabel,
    documentTypeLabel,
    formattedFileSize,
    formattedExpirationDate,
    isExpired,
    isExpiringSoon
  }
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
