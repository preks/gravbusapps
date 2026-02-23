/**
 * FortuneSheet Operation Mapper
 *
 * Translates FortuneSheet onOp events to our DocumentOperation format
 * and vice versa for collaboration sync.
 */

import type { FortuneSheetOp, ConversionContext, CellReference } from '../types/fortuneSheet'
import type { DocumentOperation } from '../../shared/services/CollaborationClient'
import { parseCellReferenceFromPath, HEADER_ROW_OFFSET } from './fortuneSheetConverter'

/**
 * Convert FortuneSheet operation to our DocumentOperation format
 */
export function convertFortuneSheetOpToDocumentOp(
  fortuneOp: FortuneSheetOp,
  context: ConversionContext,
  sheetId: string
): DocumentOperation | null {
  switch (fortuneOp.op) {
    case 'replace': {
      // Cell value change
      const cellRef = parseCellReferenceFromPath(fortuneOp.path, context)
      if (!cellRef) {
        return null
      }

      // Detect which property is being changed (e.g., 'v', 'f', 'm')
      // Path format: ['data', rowIndex, colIndex, property?]
      const property = fortuneOp.path.length >= 4 ? String(fortuneOp.path[3]) : 'v'
      const columnName = context.columnIdToName.get(cellRef.columnId) ?? cellRef.columnId

      return {
        type: 'cell_change',
        data: {
          sheetId,
          rowId: cellRef.rowId,
          columnId: cellRef.columnId,
          column: columnName, // Row data is keyed by column name for correct persistence
          rowIndex: cellRef.rowIndex,
          columnIndex: cellRef.columnIndex,
          value: fortuneOp.value,
          property, // Include which property was changed (v=value, f=formula, m=display)
          path: fortuneOp.path
        }
      }
    }

    case 'insertRowCol': {
      // Row or column insertion
      const { type, index, count, direction } = fortuneOp.data || {}

      if (type === 'row') {
        return {
          type: 'row_add',
          data: {
            sheetId,
            index: index || 0, // Direct mapping, no header row
            count: count || 1,
            direction
          }
        }
      } else if (type === 'column') {
        return {
          type: 'column_add',
          data: {
            sheetId,
            index: index || 0,
            count: count || 1,
            direction
          }
        }
      }
      return null
    }

    case 'deleteRowCol': {
      // Row or column deletion
      const { type, start, end } = fortuneOp.data || {}

      if (type === 'row') {
        return {
          type: 'row_delete',
          data: {
            sheetId,
            startIndex: start || 0, // Direct mapping, no header row
            endIndex: end || 0,
            count: end && start ? end - start + 1 : 1
          }
        }
      } else if (type === 'column') {
        return {
          type: 'column_delete',
          data: {
            sheetId,
            startIndex: start || 0,
            endIndex: end || 0,
            count: end && start ? end - start + 1 : 1
          }
        }
      }
      return null
    }

    case 'add': {
      // Generic add operation (cell addition)
      const cellRef = parseCellReferenceFromPath(fortuneOp.path, context)
      if (cellRef) {
        const columnName = context.columnIdToName.get(cellRef.columnId) ?? cellRef.columnId
        return {
          type: 'cell_change',
          data: {
            sheetId,
            rowId: cellRef.rowId,
            columnId: cellRef.columnId,
            column: columnName, // Row data is keyed by column name for correct persistence
            rowIndex: cellRef.rowIndex,
            columnIndex: cellRef.columnIndex,
            value: fortuneOp.value,
            path: fortuneOp.path
          }
        }
      }
      return null
    }

    case 'remove': {
      // Cell removal (set to null/empty) - e.g. multi-cell backspace/delete
      const cellRef = parseCellReferenceFromPath(fortuneOp.path, context)
      if (cellRef) {
        const columnName = context.columnIdToName.get(cellRef.columnId) ?? cellRef.columnId
        return {
          type: 'cell_change',
          data: {
            sheetId,
            rowId: cellRef.rowId,
            columnId: cellRef.columnId,
            column: columnName, // Row data is keyed by column name for correct persistence
            rowIndex: cellRef.rowIndex,
            columnIndex: cellRef.columnIndex,
            value: null,
            path: fortuneOp.path
          }
        }
      }
      return null
    }

    case 'addSheet':
    case 'deleteSheet':
      // These are handled outside FortuneSheet at the app level
      return null

    default:
      console.warn('Unknown FortuneSheet operation type:', fortuneOp.op)
      return null
  }
}

/**
 * Convert our DocumentOperation to FortuneSheet operation format
 * Used to apply remote changes from other users to local FortuneSheet instance
 */
export function convertDocumentOpToFortuneSheetOp(
  docOp: DocumentOperation,
  context: ConversionContext,
  sheetId: string
): FortuneSheetOp | null {
  const opType = docOp.type
  const opData = docOp.data as any

  switch (opType) {
    case 'cell_change': {
      // Cell value change from remote user
      const { rowIndex, columnIndex, value, property } = opData

      if (rowIndex === undefined || columnIndex === undefined) {
        return null
      }

      const cellRef: CellReference = {
        rowIndex,
        columnIndex,
        rowId: context.rowIndexToId.get(rowIndex) || `row_${rowIndex}`,
        columnId: context.columnIndexToId.get(columnIndex) || `col_${columnIndex}`
      }

      // Check if value is a full cell object (has formula or cell type info)
      // If so, we should replace the entire cell, not just a property
      const isFullCellObject = value && typeof value === 'object' && ('f' in value || ('v' in value && 'ct' in value))

      if (isFullCellObject) {
        const fortuneSheetRow = cellRef.rowIndex + HEADER_ROW_OFFSET
        return {
          op: 'replace',
          id: sheetId,
          path: ['data', fortuneSheetRow, cellRef.columnIndex],
          value
        }
      }

      // Use the property from the operation (f=formula, v=value, m=display)
      // Default to 'v' for backwards compatibility
      const targetProperty = property || 'v'

      // Path must use FortuneSheet row index (row 0=header, 1+=data) for applyOp compatibility
      const fortuneSheetRow = cellRef.rowIndex + HEADER_ROW_OFFSET
      return {
        op: 'replace',
        id: sheetId,
        path: ['data', fortuneSheetRow, cellRef.columnIndex, targetProperty],
        value
      }
    }

    case 'row_add': {
      const { index, count, direction } = opData
      return {
        op: 'insertRowCol',
        id: sheetId,
        path: [],
        data: {
          type: 'row',
          index: index || 0, // Direct mapping, no header row
          count: count || 1,
          direction: direction || 'rightbottom'
        }
      }
    }

    case 'row_delete': {
      const { startIndex, endIndex } = opData
      return {
        op: 'deleteRowCol',
        id: sheetId,
        path: [],
        data: {
          type: 'row',
          start: startIndex || 0, // Direct mapping, no header row
          end: endIndex || 0
        }
      }
    }

    case 'column_add': {
      const { index, count, direction } = opData
      return {
        op: 'insertRowCol',
        id: sheetId,
        path: [],
        data: {
          type: 'column',
          index: index || 0,
          count: count || 1,
          direction: direction || 'rightbottom'
        }
      }
    }

    case 'column_delete': {
      const { startIndex, endIndex } = opData
      return {
        op: 'deleteRowCol',
        id: sheetId,
        path: [],
        data: {
          type: 'column',
          start: startIndex || 0,
          end: endIndex || 0
        }
      }
    }

    default:
      console.warn('Unknown DocumentOperation type:', opType)
      return null
  }
}

/**
 * Batch convert multiple FortuneSheet operations
 */
export function batchConvertFortuneSheetOps(
  fortuneOps: FortuneSheetOp[],
  context: ConversionContext,
  sheetId: string
): DocumentOperation[] {
  return fortuneOps
    .map(op => convertFortuneSheetOpToDocumentOp(op, context, sheetId))
    .filter((op): op is DocumentOperation => op !== null)
}

/**
 * Batch convert multiple document operations
 */
export function batchConvertDocumentOps(
  docOps: DocumentOperation[],
  context: ConversionContext,
  sheetId: string
): FortuneSheetOp[] {
  return docOps
    .map(op => convertDocumentOpToFortuneSheetOp(op, context, sheetId))
    .filter((op): op is FortuneSheetOp => op !== null)
}

/**
 * Check if operation should be debounced
 * Rapid cell edits should be debounced to avoid flooding the network.
 * remove ops are NOT debounced so multi-cell delete (5x5, etc.) reliably persists all cells -
 * FortuneSheet may emit remove ops in async batches; immediate emit avoids dropping any.
 */
export function shouldDebounceOperation(op: FortuneSheetOp): boolean {
  // Debounce cell edits (replace, add). Don't debounce remove - emit immediately.
  // Don't debounce structural changes (row/column add/delete)
  return op.op === 'replace' || op.op === 'add'
}

/**
 * Get operation priority for conflict resolution
 * Higher priority operations take precedence
 */
export function getOperationPriority(op: DocumentOperation): number {
  switch (op.type) {
    case 'row_delete':
    case 'column_delete':
      return 100 // Structural deletions have highest priority
    case 'row_add':
    case 'column_add':
      return 90 // Structural additions
    case 'cell_change':
      return 50 // Cell changes have normal priority
    default:
      return 10
  }
}

/**
 * Merge conflicting operations
 * When two users edit the same cell simultaneously, apply last-write-wins
 */
export function mergeConflictingOperations(localOp: DocumentOperation, remoteOp: DocumentOperation): DocumentOperation {
  // For now, use simple last-write-wins strategy
  // Remote operation wins (it has already been applied on server)
  return remoteOp
}

/**
 * Validate operation before applying
 */
export function validateOperation(op: DocumentOperation): boolean {
  const opData = op.data as any

  switch (op.type) {
    case 'cell_change': {
      const { rowIndex, columnIndex } = opData
      // Accept if indices are valid numbers - don't require context to have them
      // (context can lag when remote user adds rows/cols before we've applied structural ops)
      return typeof rowIndex === 'number' && typeof columnIndex === 'number' && rowIndex >= 0 && columnIndex >= 0
    }

    case 'row_add':
    case 'row_delete': {
      const { index, startIndex } = opData
      const targetIndex = index !== undefined ? index : startIndex
      // Check if index is valid
      return targetIndex !== undefined && targetIndex >= 0
    }

    case 'column_add':
    case 'column_delete': {
      const { index, startIndex } = opData
      const targetIndex = index !== undefined ? index : startIndex
      return targetIndex !== undefined && targetIndex >= 0
    }

    default:
      return true
  }
}
