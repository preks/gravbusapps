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
} from '../types';

/**
 * Transform BaseCustomerTask (GraphQL response) to CustomerTask (enhanced with computed fields)
 */
export function toCustomerTask(base: BaseCustomerTask): CustomerTask {
  // Extract labels from catalog entries
  const taskTypeLabel = base.taskType?.value || base.taskType?.code;
  const taskPriorityLabel = base.taskPriority?.value || base.taskPriority?.code;
  const taskStatusLabel = base.taskStatus?.value || base.taskStatus?.code;
  
  // Employee display names
  const creatorDisplayName = base.creatorEmployee?.displayName || 
    `${base.creatorEmployee?.firstName || ''} ${base.creatorEmployee?.lastName || ''}`.trim();
  const assignedDisplayName = base.assignedEmployee?.displayName || 
    `${base.assignedEmployee?.firstName || ''} ${base.assignedEmployee?.lastName || ''}`.trim();
  
  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code;
  const contactDisplayName = base.contact?.fullName || 
    `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim();
  const leadDisplayName = base.lead?.firstName && base.lead?.lastName ? 
    `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code;
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code;

  // Create computed display name
  const displayName = base.name || base.code || `Task ${base.id}`;

  // Format dates
  const formattedDueDate = base.dueDate ? new Date(base.dueDate).toLocaleDateString() : undefined;
  const formattedStartDate = base.startDate ? new Date(base.startDate).toLocaleDateString() : undefined;
  const formattedEndDate = base.endDate ? new Date(base.endDate).toLocaleDateString() : undefined;

  return {
    ...base,
    displayName,
    taskTypeLabel,
    taskPriorityLabel,
    taskStatusLabel,
    creatorDisplayName,
    assignedDisplayName,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName,
    formattedDueDate,
    formattedStartDate,
    formattedEndDate
  };
}

/**
 * Transform BaseCustomerActivity (GraphQL response) to CustomerActivity (enhanced with computed fields)
 */
export function toCustomerActivity(base: BaseCustomerActivity): CustomerActivity {
  // Extract labels from catalog entries
  const activityTypeLabel = base.activityType?.value || base.activityType?.code;
  
  // Employee display names
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();
  
  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code;
  const contactDisplayName = base.contact?.fullName || 
    `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim();
  const leadDisplayName = base.lead?.firstName && base.lead?.lastName ? 
    `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code;
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code;

  // Create computed display name
  const displayName = base.title || `Activity ${base.id}`;

  // Format dates
  const formattedOccurredAt = base.occurredAt ? new Date(base.occurredAt).toLocaleDateString() : undefined;
  const formattedCompletedAt = base.completedAt ? new Date(base.completedAt).toLocaleDateString() : undefined;

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
  };
}

/**
 * Transform BaseCustomerNote (GraphQL response) to CustomerNote (enhanced with computed fields)
 */
export function toCustomerNote(base: BaseCustomerNote): CustomerNote {
  // Employee display names
  const authorDisplayName = base.authorEmployee?.displayName || 
    `${base.authorEmployee?.firstName || ''} ${base.authorEmployee?.lastName || ''}`.trim();

  // Create computed display name
  const displayName = base.title || `Note ${base.id}`;

  // Format dates
  const formattedReminderDate = base.reminderDate ? new Date(base.reminderDate).toLocaleDateString() : undefined;

  return {
    ...base,
    displayName,
    authorDisplayName,
    formattedReminderDate
  };
}

/**
 * Transform BaseCustomerDocument (GraphQL response) to CustomerDocument (enhanced with computed fields)
 */
export function toCustomerDocument(base: BaseCustomerDocument): CustomerDocument {
  // Extract labels from catalog entries
  const documentGroupLabel = base.documentGroup?.value || base.documentGroup?.code;
  const documentTypeLabel = base.documentType?.value || base.documentType?.code;

  // Create computed display name
  const displayName = base.name || `Document ${base.id}`;

  // Format file size
  const formattedFileSize = base.fileSize ? formatFileSize(base.fileSize) : undefined;

  // Format expiration date and check expiration status
  const formattedExpirationDate = base.expirationDate ? new Date(base.expirationDate).toLocaleDateString() : undefined;
  const now = new Date();
  const expirationDate = base.expirationDate ? new Date(base.expirationDate) : null;
  const isExpired = expirationDate ? expirationDate < now : false;
  const isExpiringSoon = expirationDate ? 
    (expirationDate.getTime() - now.getTime()) < (30 * 24 * 60 * 60 * 1000) && !isExpired : false; // 30 days

  return {
    ...base,
    displayName,
    documentGroupLabel,
    documentTypeLabel,
    formattedFileSize,
    formattedExpirationDate,
    isExpired,
    isExpiringSoon
  };
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}
