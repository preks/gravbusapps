/**
 * Tracking Columns Utilities
 * 
 * Helper functions for creating and managing tracking columns
 * that are auto-generated when running bulk collection automations.
 */

import type { SpreadsheetColumn } from '../types/spreadsheet'
import { TRACKING_COLUMNS, getTrackingColumnDefinitions } from '../components/automations/TrackingColumnsConfig'

/**
 * Create SpreadsheetColumn definitions for selected tracking columns
 */
export function createTrackingColumnDefinitions(
  selectedColumnIds: string[],
  existingColumnCount: number
): SpreadsheetColumn[] {
  const definitions = getTrackingColumnDefinitions(selectedColumnIds)
  
  return definitions.map((def, index) => ({
    id: def.name, // Use the internal name as ID (e.g., '_recipient_name')
    name: def.name,
    label: def.label,
    type: getColumnTypeForTracking(def.id),
    isVisible: true,
    isEditable: false, // Tracking columns are read-only
    isRequired: false,
    isUnique: false,
    order: existingColumnCount + index
  }))
}

/**
 * Get the appropriate column type for a tracking column
 */
function getColumnTypeForTracking(columnId: string): SpreadsheetColumn['type'] {
  switch (columnId) {
    case 'sent_at':
    case 'responded_at':
      return 'datetime'
    case 'recipient_email':
      return 'email'
    case 'recipient_avatar':
      return 'image'
    default:
      return 'text'
  }
}

/**
 * Recipient info interface for tracking columns
 */
export interface RecipientInfo {
  id: string
  name?: string
  email?: string
  avatar?: string
}

/**
 * Build tracking column values for a "Sent" row (before response)
 */
export function buildSentRowTrackingValues(
  selectedColumnIds: string[],
  recipientInfo: RecipientInfo,
  sentAt: string
): Record<string, unknown> {
  console.log('[trackingColumns] buildSentRowTrackingValues called with:', {
    selectedColumnIds,
    recipientInfo,
    sentAt
  })
  
  const values: Record<string, unknown> = {}
  
  selectedColumnIds.forEach(colId => {
    const def = TRACKING_COLUMNS.find(c => c.id === colId)
    console.log(`[trackingColumns] Processing colId "${colId}", found def:`, def ? { id: def.id, name: def.name } : 'NOT FOUND')
    if (!def) return
    
    switch (colId) {
      case 'recipient_avatar':
        values[def.name] = recipientInfo.avatar || ''
        break
      case 'recipient_name':
        values[def.name] = recipientInfo.name || 'Unknown'
        break
      case 'recipient_email':
        values[def.name] = recipientInfo.email || ''
        break
      case 'sent_at':
        values[def.name] = sentAt
        break
      case 'responded_at':
        values[def.name] = '' // Not yet responded
        break
      case 'response_time':
        values[def.name] = '' // Not yet calculated
        break
      case 'workflow_status':
        values[def.name] = 'Sent'
        break
    }
  })
  
  console.log('[trackingColumns] Final values:', values)
  return values
}

/**
 * Build tracking column values for a "Completed" row (after response)
 */
export function buildCompletedRowTrackingValues(
  selectedColumnIds: string[],
  recipientInfo: RecipientInfo,
  sentAt: string,
  respondedAt: string
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  
  selectedColumnIds.forEach(colId => {
    const def = TRACKING_COLUMNS.find(c => c.id === colId)
    if (!def) return
    
    switch (colId) {
      case 'recipient_avatar':
        values[def.name] = recipientInfo.avatar || ''
        break
      case 'recipient_name':
        values[def.name] = recipientInfo.name || 'Unknown'
        break
      case 'recipient_email':
        values[def.name] = recipientInfo.email || ''
        break
      case 'sent_at':
        values[def.name] = sentAt
        break
      case 'responded_at':
        values[def.name] = respondedAt
        break
      case 'response_time':
        values[def.name] = calculateResponseTime(sentAt, respondedAt)
        break
      case 'workflow_status':
        values[def.name] = 'Completed'
        break
    }
  })
  
  return values
}

/**
 * Calculate human-readable response time
 */
function calculateResponseTime(sentAt: string, respondedAt: string): string {
  const sent = new Date(sentAt)
  const responded = new Date(respondedAt)
  const diffMs = responded.getTime() - sent.getTime()
  
  if (diffMs < 0) return '—'
  
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`
  }
  
  if (diffHours > 0) {
    const remainingMins = diffMins % 60
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`
  }
  
  return `${diffMins}m`
}

/**
 * Check if a column name is a tracking column
 */
export function isTrackingColumn(columnName: string): boolean {
  const result = TRACKING_COLUMNS.some(col => col.name === columnName)
  console.log(`[trackingColumns] isTrackingColumn("${columnName}") = ${result}`)
  return result
}

/**
 * Get all tracking column names (internal names like '_recipient_name')
 */
export function getAllTrackingColumnNames(): string[] {
  return TRACKING_COLUMNS.map(col => col.name)
}
