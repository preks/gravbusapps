/**
 * useFortuneSheetCollaboration Hook
 *
 * Manages real-time collaboration sync between FortuneSheet and our collaboration system.
 * Handles bidirectional operation conversion and application.
 */

import { useCallback, useRef, useEffect, useMemo } from 'react'
import type { FortuneSheetOp, ConversionContext } from '../types/fortuneSheet'
import type { DocumentOperation } from '../../shared/services/CollaborationClient'
import {
  convertFortuneSheetOpToDocumentOp,
  convertDocumentOpToFortuneSheetOp,
  shouldDebounceOperation,
  validateOperation
} from '../utils/fortuneSheetOperations'

export interface UseFortuneSheetCollaborationOptions {
  /** Sheet ID for collaboration scope */
  sheetId: string
  /** Conversion context for mapping between formats */
  context: ConversionContext
  /** Whether collaboration is enabled */
  enabled: boolean
  /** Callback to emit operations to collaboration server */
  onOperationEmit: (operation: DocumentOperation) => void
  /** Callback to apply remote operations to FortuneSheet */
  onApplyOperation: (operation: FortuneSheetOp) => void
  /** Debounce delay for cell changes (ms) */
  debounceDelay?: number
}

export interface UseFortuneSheetCollaborationReturn {
  /** Handle FortuneSheet operation (from local user) */
  handleFortuneSheetOp: (op: FortuneSheetOp) => void
  /** Handle incoming document operation (from remote user) */
  handleDocumentOp: (op: DocumentOperation) => void
  /** Clear pending operations */
  clearPending: () => void
}

/**
 * Hook for managing FortuneSheet collaboration
 */
export function useFortuneSheetCollaboration(
  options: UseFortuneSheetCollaborationOptions
): UseFortuneSheetCollaborationReturn {
  const { sheetId, context, enabled, onOperationEmit, onApplyOperation, debounceDelay = 300 } = options

  // Pending operations for debouncing
  const pendingOpsRef = useRef<Map<string, FortuneSheetOp>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Track operations being applied to prevent feedback loops
  const applyingRemoteOpRef = useRef(false)

  /**
   * Flush pending operations to collaboration server.
   * Deduplicate: if we have two replace ops for (row, col) and (row, col+1) with the same value,
   * emit only (row, col) to avoid the other user seeing the value in both cells.
   */
  const flushPendingOperations = useCallback(() => {
    if (!enabled || pendingOpsRef.current.size === 0) {
      return
    }

    const ops = Array.from(pendingOpsRef.current.values())
    pendingOpsRef.current.clear()

    const replaceOps = ops.filter(
      (o): o is FortuneSheetOp => o.op === 'replace' && o.path.length >= 3 && o.path[0] === 'data'
    )
    const otherOps = ops.filter(o => o.op !== 'replace' || o.path[0] !== 'data')

    const skipCol = new Set<string>()
    for (let i = 0; i < replaceOps.length; i++) {
      for (let j = 0; j < replaceOps.length; j++) {
        if (i === j) continue
        const [, r1, c1] = replaceOps[i].path
        const [, r2, c2] = replaceOps[j].path
        const sameRow = r1 === r2
        const adjacentCol = (c2 as number) === (c1 as number) + 1
        const sameVal =
          replaceOps[i].value === replaceOps[j].value ||
          (replaceOps[i].value != null &&
            replaceOps[j].value != null &&
            String(replaceOps[i].value) === String(replaceOps[j].value))
        if (sameRow && adjacentCol && sameVal) {
          skipCol.add(`${r2}_${c2}`)
        }
      }
    }

    const toEmit = [...replaceOps.filter(op => !skipCol.has(`${op.path[1]}_${op.path[2]}`)), ...otherOps]

    toEmit.forEach(fortuneOp => {
      const docOp = convertFortuneSheetOpToDocumentOp(fortuneOp, context, sheetId)
      if (docOp) {
        onOperationEmit(docOp)
      }
    })
  }, [enabled, context, sheetId, onOperationEmit])

  /**
   * Handle FortuneSheet operation from local user
   */
  const handleFortuneSheetOp = useCallback(
    (op: FortuneSheetOp) => {
      // Don't emit operations if we're applying a remote operation
      if (applyingRemoteOpRef.current) {
        return
      }

      if (!enabled) {
        return
      }

      // Check if this operation should be debounced
      if (shouldDebounceOperation(op)) {
        // Create a unique key for this operation
        const opKey = `${op.op}_${op.path.join('_')}`

        // Store/update pending operation
        pendingOpsRef.current.set(opKey, op)

        // Reset debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          flushPendingOperations()
        }, debounceDelay)
      } else {
        // Non-debounced operations (structural changes) - emit immediately
        const docOp = convertFortuneSheetOpToDocumentOp(op, context, sheetId)
        if (docOp) {
          onOperationEmit(docOp)
        }
      }
    },
    [enabled, context, sheetId, onOperationEmit, debounceDelay, flushPendingOperations]
  )

  /**
   * Handle incoming document operation from remote user
   */
  const handleDocumentOp = useCallback(
    (docOp: DocumentOperation) => {
      if (!enabled) {
        return
      }

      // Validate operation before applying
      if (!validateOperation(docOp, context)) {
        console.warn('Invalid remote operation:', docOp)
        return
      }

      // Convert to FortuneSheet operation
      const fortuneOp = convertDocumentOpToFortuneSheetOp(docOp, context, sheetId)
      if (!fortuneOp) {
        return
      }

      // Set flag to prevent feedback loop
      applyingRemoteOpRef.current = true

      try {
        // Apply operation to FortuneSheet
        onApplyOperation(fortuneOp)
      } catch (error) {
        console.error('Error applying remote operation:', error)
      } finally {
        // Reset flag after a short delay to allow FortuneSheet to process
        setTimeout(() => {
          applyingRemoteOpRef.current = false
        }, 50)
      }
    },
    [enabled, context, sheetId, onApplyOperation]
  )

  /**
   * Clear pending operations
   */
  const clearPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    pendingOpsRef.current.clear()
  }, [])

  /**
   * Flush pending operations on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      flushPendingOperations()
    }
  }, [flushPendingOperations])

  // PHASE 2.2: Memoize return value to prevent new object reference on every render
  return useMemo(
    () => ({
      handleFortuneSheetOp,
      handleDocumentOp,
      clearPending
    }),
    [handleFortuneSheetOp, handleDocumentOp, clearPending]
  )
}

/**
 * Hook for cursor tracking in FortuneSheet
 */
export function useFortuneSheetCursorTracking(options: {
  sheetId: string
  context: ConversionContext
  enabled: boolean
  onCursorEmit: (position: { path: string[] }) => void
}) {
  const { sheetId, context, enabled, onCursorEmit } = options
  const lastCursorRef = useRef<{ row: number; col: number } | null>(null)

  /**
   * Handle cell selection change in FortuneSheet
   */
  const handleCellSelection = useCallback(
    (row: number, col: number) => {
      if (!enabled) {
        return
      }

      // Check if cursor actually moved
      if (lastCursorRef.current?.row === row && lastCursorRef.current?.col === col) {
        return
      }

      lastCursorRef.current = { row, col }

      // No header row - direct mapping
      const rowId = context.rowIndexToId.get(row)
      const columnId = context.columnIndexToId.get(col)

      if (!rowId || !columnId) {
        return
      }

      // Emit cursor position
      onCursorEmit({
        path: [sheetId, rowId, columnId]
      })
    },
    [enabled, sheetId, context, onCursorEmit]
  )

  // PHASE 2.2: Memoize return value to prevent new object reference on every render
  return useMemo(
    () => ({
      handleCellSelection
    }),
    [handleCellSelection]
  )
}

/**
 * Hook for batch operation processing
 * Useful for handling multiple operations at once (e.g., paste, fill)
 */
export function useFortuneSheetBatchOps(options: {
  sheetId: string
  context: ConversionContext
  enabled: boolean
  onOperationEmit: (operation: DocumentOperation) => void
  batchDelay?: number
}) {
  const { sheetId, context, enabled, onOperationEmit, batchDelay = 100 } = options
  const batchQueueRef = useRef<FortuneSheetOp[]>([])
  const batchTimerRef = useRef<NodeJS.Timeout>()

  /**
   * Add operation to batch queue
   */
  const queueOperation = useCallback(
    (op: FortuneSheetOp) => {
      if (!enabled) {
        return
      }

      batchQueueRef.current.push(op)

      // Reset batch timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }

      batchTimerRef.current = setTimeout(() => {
        // Process batch
        const ops = batchQueueRef.current
        batchQueueRef.current = []

        // Convert and emit operations
        ops.forEach(fortuneOp => {
          const docOp = convertFortuneSheetOpToDocumentOp(fortuneOp, context, sheetId)
          if (docOp) {
            onOperationEmit(docOp)
          }
        })
      }, batchDelay)
    },
    [enabled, context, sheetId, onOperationEmit, batchDelay]
  )

  /**
   * Flush batch queue immediately
   */
  const flushBatch = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
    }

    if (batchQueueRef.current.length === 0) {
      return
    }

    const ops = batchQueueRef.current
    batchQueueRef.current = []

    ops.forEach(fortuneOp => {
      const docOp = convertFortuneSheetOpToDocumentOp(fortuneOp, context, sheetId)
      if (docOp) {
        onOperationEmit(docOp)
      }
    })
  }, [context, sheetId, onOperationEmit])

  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }
      flushBatch()
    }
  }, [flushBatch])

  // PHASE 2.2: Memoize return value to prevent new object reference on every render
  return useMemo(
    () => ({
      queueOperation,
      flushBatch
    }),
    [queueOperation, flushBatch]
  )
}
