// Investment Related Entity Mappers - Transform base types to enhanced types with computed fields

import {
  BaseInvestmentTask,
  BaseInvestmentActivity,
  BaseInvestmentNote,
  BaseInvestmentDocument,
  InvestmentTask,
  InvestmentActivity,
  InvestmentNote,
  InvestmentDocument
} from '../types';

/**
 * Transform BaseInvestmentTask (GraphQL response) to InvestmentTask (enhanced with computed fields)
 */
export function toInvestmentTask(base: BaseInvestmentTask): InvestmentTask {
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
    opportunityDisplayName
  };
}

/**
 * Transform BaseInvestmentActivity (GraphQL response) to InvestmentActivity (enhanced with computed fields)
 */
export function toInvestmentActivity(base: BaseInvestmentActivity): InvestmentActivity {
  // Extract labels from catalog entries
  const activityTypeLabel = base.activityType?.value || base.activityType?.code;
  
  // Employee display name
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

  return {
    ...base,
    displayName,
    activityTypeLabel,
    ownerDisplayName,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName
  };
}

/**
 * Transform BaseInvestmentNote (GraphQL response) to InvestmentNote (enhanced with computed fields)
 */
export function toInvestmentNote(base: BaseInvestmentNote): InvestmentNote {
  // Employee display name
  const authorDisplayName = base.authorEmployee?.displayName || 
    `${base.authorEmployee?.firstName || ''} ${base.authorEmployee?.lastName || ''}`.trim();
  
  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code;
  const contactDisplayName = base.contact?.fullName || 
    `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim();
  const leadDisplayName = base.lead?.firstName && base.lead?.lastName ? 
    `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code;
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code;

  // Create computed display name
  const displayName = base.title || `Note ${base.id}`;

  return {
    ...base,
    displayName,
    authorDisplayName,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName
  };
}

/**
 * Transform BaseInvestmentDocument (GraphQL response) to InvestmentDocument (enhanced with computed fields)
 */
export function toInvestmentDocument(base: BaseInvestmentDocument): InvestmentDocument {
  // Extract labels from catalog entries
  const documentGroupLabel = base.documentGroup?.value || base.documentGroup?.code;
  const documentTypeLabel = base.documentType?.value || base.documentType?.code;
  
  // Format file size
  const fileSizeFormatted = base.fileSize ? formatFileSize(base.fileSize) : undefined;
  
  // Entity display names
  const accountDisplayName = base.account?.name || base.account?.code;
  const contactDisplayName = base.contact?.fullName || 
    `${base.contact?.firstName || ''} ${base.contact?.lastName || ''}`.trim();
  const leadDisplayName = base.lead?.firstName && base.lead?.lastName ? 
    `${base.lead.firstName} ${base.lead.lastName}` : base.lead?.code;
  const opportunityDisplayName = base.opportunity?.name || base.opportunity?.code;

  // Create computed display name
  const displayName = base.name || `Document ${base.id}`;

  return {
    ...base,
    displayName,
    documentGroupLabel,
    documentTypeLabel,
    fileSizeFormatted,
    accountDisplayName,
    contactDisplayName,
    leadDisplayName,
    opportunityDisplayName
  };
}

/**
 * Helper function to format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
