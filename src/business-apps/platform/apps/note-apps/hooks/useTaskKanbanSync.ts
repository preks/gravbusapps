/**
 * useTaskKanbanSync Hook
 *
 * Handles bidirectional synchronization between task items and Kanban cards.
 * - When task item content changes, updates linked Kanban card
 * - When Kanban card changes (content, status, assignee), triggers task item re-render
 * - Handles checked state syncing (checked task -> moves card to Done column)
 */

import { useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import type { KanbanData, KanbanCard } from '../../shared/extensions/Kanban'
import { KANBAN_DEFAULT_COLUMN_IDS } from '../../shared/extensions/kanbanConstants'

interface UseTaskKanbanSyncOptions {
  editor: Editor | null
  enabled?: boolean
}

interface LinkedTaskInfo {
  pos: number
  kanbanId: string
  kanbanCardId: string
  content: string
  checked: boolean
}

interface LinkedCardInfo {
  kanbanId: string
  kanbanPos: number
  card: KanbanCard
  columnId: string
  columnTitle: string
}

/**
 * Find all linked task items in the document
 */
function findLinkedTaskItems(editor: Editor): LinkedTaskInfo[] {
  const items: LinkedTaskInfo[] = []

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'taskItem' && node.attrs.kanbanCardId && node.attrs.kanbanId) {
      items.push({
        pos,
        kanbanId: node.attrs.kanbanId,
        kanbanCardId: node.attrs.kanbanCardId,
        content: node.textContent,
        checked: node.attrs.checked
      })
    }
  })

  return items
}

/**
 * Find all Kanban boards and their linked cards
 */
function findLinkedKanbanCards(editor: Editor): Map<string, LinkedCardInfo> {
  const cards = new Map<string, LinkedCardInfo>()

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'kanban') {
      try {
        const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
        for (const column of data.columns || []) {
          for (const card of column.cards || []) {
            if (card.linkedTaskItemId) {
              cards.set(card.id, {
                kanbanId: node.attrs.id,
                kanbanPos: pos,
                card,
                columnId: column.id,
                columnTitle: column.title
              })
            }
          }
        }
      } catch {
        // Invalid JSON
      }
    }
  })

  return cards
}

/**
 * Update a Kanban card's content
 */
function updateKanbanCardContent(editor: Editor, kanbanId: string, cardId: string, newContent: string): boolean {
  let updated = false

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'kanban' && node.attrs.id === kanbanId) {
      try {
        const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
        let cardFound = false

        for (const column of data.columns) {
          const cardIndex = column.cards.findIndex(c => c.id === cardId)
          if (cardIndex !== -1) {
            column.cards[cardIndex] = {
              ...column.cards[cardIndex],
              content: newContent
            }
            cardFound = true
            break
          }
        }

        if (cardFound) {
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dataJson: JSON.stringify(data)
              })
              return true
            })
            .run()
          updated = true
        }
      } catch {
        // Invalid JSON
      }
      return false
    }
  })

  return updated
}

/**
 * Move a Kanban card to a different column (e.g., when task is checked)
 */
function moveKanbanCardToColumn(editor: Editor, kanbanId: string, cardId: string, targetColumnId: string): boolean {
  let updated = false

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'kanban' && node.attrs.id === kanbanId) {
      try {
        const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
        let movedCard: KanbanCard | null = null
        let sourceColumnId: string | null = null

        // Find and remove the card from its current column
        for (const column of data.columns) {
          const cardIndex = column.cards.findIndex(c => c.id === cardId)
          if (cardIndex !== -1) {
            if (column.id === targetColumnId) {
              // Already in target column
              return false
            }
            movedCard = column.cards[cardIndex]
            sourceColumnId = column.id
            column.cards.splice(cardIndex, 1)
            break
          }
        }

        if (movedCard && sourceColumnId !== targetColumnId) {
          // Add to target column
          const targetColumn = data.columns.find(c => c.id === targetColumnId)
          if (targetColumn) {
            targetColumn.cards.push(movedCard)

            editor
              .chain()
              .focus()
              .command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  dataJson: JSON.stringify(data)
                })
                return true
              })
              .run()
            updated = true
          }
        }
      } catch {
        // Invalid JSON
      }
      return false
    }
  })

  return updated
}

/**
 * Update a task item's text content
 */
function updateTaskItemContent(editor: Editor, taskItemPos: number, newContent: string): boolean {
  const node = editor.state.doc.nodeAt(taskItemPos)
  if (!node || node.type.name !== 'taskItem') return false

  // Task items contain inline content directly
  // We need to find the exact text range to replace
  let textStart = taskItemPos + 1
  let textEnd = taskItemPos + node.nodeSize - 1

  // If there's a paragraph inside, go one level deeper
  if (node.firstChild && node.firstChild.type.name === 'paragraph') {
    textStart = taskItemPos + 2 // skip taskItem opening + paragraph opening
    textEnd = taskItemPos + node.nodeSize - 2 // skip taskItem closing + paragraph closing
  }

  // Replace the content using replaceWith to avoid structural changes
  editor
    .chain()
    .command(({ tr }) => {
      // Create a text node with the new content
      const textNode = newContent ? editor.state.schema.text(newContent) : null

      if (textNode) {
        tr.replaceWith(textStart, textEnd, textNode)
      } else {
        tr.delete(textStart, textEnd)
      }
      return true
    })
    .run()

  return true
}

/**
 * Update a task item's checked state
 */
function updateTaskItemChecked(editor: Editor, taskItemPos: number, checked: boolean): boolean {
  const node = editor.state.doc.nodeAt(taskItemPos)
  if (!node || node.type.name !== 'taskItem') return false

  editor
    .chain()
    .command(({ tr }) => {
      tr.setNodeMarkup(taskItemPos, undefined, {
        ...node.attrs,
        checked
      })
      return true
    })
    .run()

  return true
}

export function useTaskKanbanSync({ editor, enabled = true }: UseTaskKanbanSyncOptions) {
  const previousTaskContentsRef = useRef<Map<string, { content: string; checked: boolean }>>(new Map())
  const previousKanbanContentsRef = useRef<Map<string, string>>(new Map())
  const previousKanbanColumnsRef = useRef<Map<string, string>>(new Map()) // Track card column changes
  const syncInProgressRef = useRef(false)
  const trackingInitializedRef = useRef(false)
  // Track when sync made changes to ignore subsequent transactions from those changes
  const lastSyncChangeTimeRef = useRef(0)

  /**
   * Sync task item content changes to Kanban cards
   */
  const syncTaskToKanban = useCallback(() => {
    if (!editor || !enabled || syncInProgressRef.current) return

    syncInProgressRef.current = true
    let madeChanges = false

    try {
      const linkedTasks = findLinkedTaskItems(editor)
      const previousContents = previousTaskContentsRef.current

      for (const task of linkedTasks) {
        const prevState = previousContents.get(task.kanbanCardId)
        const currentContent = task.content
        const currentChecked = task.checked

        // Content changed - update Kanban card
        if (prevState && prevState.content !== currentContent) {
          updateKanbanCardContent(editor, task.kanbanId, task.kanbanCardId, currentContent)
          // Also update Kanban tracking to prevent reverse sync
          previousKanbanContentsRef.current.set(task.kanbanCardId, currentContent)
          madeChanges = true
        }

        // Checked state changed - move card
        if (prevState && prevState.checked !== currentChecked) {
          if (currentChecked) {
            // Task was checked - move to Done
            moveKanbanCardToColumn(editor, task.kanbanId, task.kanbanCardId, KANBAN_DEFAULT_COLUMN_IDS.done)
          } else {
            // Task was unchecked - move back to To Do
            moveKanbanCardToColumn(editor, task.kanbanId, task.kanbanCardId, KANBAN_DEFAULT_COLUMN_IDS.todo)
          }
          madeChanges = true
        }

        // Update previous state
        previousContents.set(task.kanbanCardId, {
          content: currentContent,
          checked: currentChecked
        })
      }

      // Track when we made changes to avoid re-syncing from our own transactions
      if (madeChanges) {
        lastSyncChangeTimeRef.current = Date.now()
      }
    } finally {
      syncInProgressRef.current = false
    }
  }, [editor, enabled])

  /**
   * Sync Kanban card content and column changes to task items
   */
  const syncKanbanToTask = useCallback(() => {
    if (!editor || !enabled || syncInProgressRef.current) return

    syncInProgressRef.current = true
    let madeChanges = false

    try {
      const linkedCards = findLinkedKanbanCards(editor)
      const linkedTasks = findLinkedTaskItems(editor)
      const previousKanbanContents = previousKanbanContentsRef.current
      const previousKanbanColumns = previousKanbanColumnsRef.current

      // Create a map of cardId -> taskInfo for quick lookup
      const taskByCardId = new Map<string, LinkedTaskInfo>()
      for (const task of linkedTasks) {
        taskByCardId.set(task.kanbanCardId, task)
      }

      // Check for Kanban card content and column changes
      linkedCards.forEach((cardInfo, cardId) => {
        const prevContent = previousKanbanContents.get(cardId)
        const prevColumn = previousKanbanColumns.get(cardId)
        const currentContent = cardInfo.card.content
        const currentColumn = cardInfo.columnId

        const task = taskByCardId.get(cardId)

        // Content changed in Kanban - update task item text
        if (prevContent !== undefined && prevContent !== currentContent) {
          if (task && task.content !== currentContent) {
            updateTaskItemContent(editor, task.pos, currentContent)
            // Update task tracking to prevent reverse sync
            previousTaskContentsRef.current.set(cardId, {
              content: currentContent,
              checked: task.checked
            })
            madeChanges = true
          }
        }

        // Column changed in Kanban - update task item checked state
        if (prevColumn !== undefined && prevColumn !== currentColumn) {
          if (task) {
            // Moving to "done" column = check the task
            // Moving from "done" column = uncheck the task
            const shouldBeChecked = currentColumn === 'done'
            if (task.checked !== shouldBeChecked) {
              updateTaskItemChecked(editor, task.pos, shouldBeChecked)
              // Update task tracking to prevent reverse sync
              previousTaskContentsRef.current.set(cardId, {
                content: task.content,
                checked: shouldBeChecked
              })
              madeChanges = true
            }
          }
        }

        // Update Kanban tracking
        previousKanbanContents.set(cardId, currentContent)
        previousKanbanColumns.set(cardId, currentColumn)
      })

      // Track when we made changes to avoid re-syncing from our own transactions
      if (madeChanges) {
        lastSyncChangeTimeRef.current = Date.now()
      }
    } finally {
      syncInProgressRef.current = false
    }
  }, [editor, enabled])

  /**
   * Add a task item to a Kanban board
   */
  const addTaskToKanban = useCallback(
    (taskItemPos: number, kanbanId: string, targetColumnId: string = 'todo'): string | null => {
      if (!editor) {
        console.debug('[useTaskKanbanSync] addTaskToKanban: no editor')
        return null
      }

      const taskNode = editor.state.doc.nodeAt(taskItemPos)
      console.debug('[useTaskKanbanSync] addTaskToKanban:', {
        taskItemPos,
        kanbanId,
        targetColumnId,
        nodeFound: !!taskNode,
        nodeType: taskNode?.type.name,
        nodeContent: taskNode?.textContent?.slice(0, 50)
      })

      if (!taskNode || taskNode.type.name !== 'taskItem') {
        console.debug('[useTaskKanbanSync] addTaskToKanban: invalid task node')
        return null
      }

      const taskContent = taskNode.textContent
      const taskItemId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const cardId = `card-${Date.now()}`

      // Find the Kanban and add a card
      let success = false
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'kanban' && node.attrs.id === kanbanId) {
          console.debug('[useTaskKanbanSync] Found Kanban at pos:', pos)
          try {
            const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
            const targetColumn = data.columns.find(c => c.id === targetColumnId) || data.columns[0]

            if (targetColumn) {
              console.debug('[useTaskKanbanSync] Adding to column:', targetColumn.title)
              targetColumn.cards.push({
                id: cardId,
                content: taskContent,
                linkedTaskItemId: taskItemId
              })

              // Update Kanban
              const kanbanUpdated = editor
                .chain()
                .command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    dataJson: JSON.stringify(data)
                  })
                  return true
                })
                .run()
              console.debug('[useTaskKanbanSync] Kanban updated:', kanbanUpdated)

              // Link task item to card
              const taskUpdated = editor
                .chain()
                .command(({ tr }) => {
                  const currentNode = tr.doc.nodeAt(taskItemPos)
                  console.debug(
                    '[useTaskKanbanSync] Linking task at pos:',
                    taskItemPos,
                    'node:',
                    currentNode?.type.name
                  )
                  if (currentNode && currentNode.type.name === 'taskItem') {
                    tr.setNodeMarkup(taskItemPos, undefined, {
                      ...currentNode.attrs,
                      kanbanId,
                      kanbanCardId: cardId
                    })
                    return true
                  }
                  return false
                })
                .run()
              console.debug('[useTaskKanbanSync] Task updated:', taskUpdated)

              // Track the initial state (content, checked, and column)
              previousTaskContentsRef.current.set(cardId, {
                content: taskContent,
                checked: taskNode.attrs.checked || false
              })
              previousKanbanContentsRef.current.set(cardId, taskContent)
              previousKanbanColumnsRef.current.set(cardId, targetColumn.id)

              success = true
            }
          } catch (err) {
            console.error('[useTaskKanbanSync] Error:', err)
          }
          return false
        }
      })

      console.debug('[useTaskKanbanSync] addTaskToKanban result:', { success, cardId })
      return success ? cardId : null
    },
    [editor]
  )

  /**
   * Remove the link between a task item and Kanban card
   */
  const unlinkTask = useCallback(
    (taskItemPos: number) => {
      if (!editor) return

      const taskNode = editor.state.doc.nodeAt(taskItemPos)
      if (!taskNode || !taskNode.attrs.kanbanCardId) return

      const cardId = taskNode.attrs.kanbanCardId
      const kanbanId = taskNode.attrs.kanbanId

      // Remove linkedTaskItemId from the Kanban card
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'kanban' && node.attrs.id === kanbanId) {
          try {
            const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
            let updated = false

            for (const column of data.columns) {
              const card = column.cards.find(c => c.id === cardId)
              if (card) {
                delete card.linkedTaskItemId
                updated = true
                break
              }
            }

            if (updated) {
              editor
                .chain()
                .command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    dataJson: JSON.stringify(data)
                  })
                  return true
                })
                .run()
            }
          } catch {
            // Invalid JSON
          }
          return false
        }
      })

      // Unlink the task item
      editor
        .chain()
        .command(({ tr }) => {
          const currentNode = tr.doc.nodeAt(taskItemPos)
          if (currentNode) {
            tr.setNodeMarkup(taskItemPos, undefined, {
              ...currentNode.attrs,
              kanbanId: null,
              kanbanCardId: null
            })
          }
          return true
        })
        .run()

      // Remove from tracking
      previousTaskContentsRef.current.delete(cardId)
    },
    [editor]
  )

  /**
   * Find all Kanban boards in the document
   */
  const findKanbanBoards = useCallback((): Array<{ id: string; pos: number; data: KanbanData }> => {
    if (!editor) return []

    const boards: Array<{ id: string; pos: number; data: KanbanData }> = []

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'kanban') {
        try {
          const data: KanbanData = JSON.parse(node.attrs.dataJson || '{}')
          boards.push({
            id: node.attrs.id,
            pos,
            data
          })
        } catch {
          // Invalid JSON
        }
      }
    })

    return boards
  }, [editor])

  // Store latest sync functions in refs to avoid dependency issues
  const syncTaskToKanbanRef = useRef(syncTaskToKanban)
  const syncKanbanToTaskRef = useRef(syncKanbanToTask)

  // Keep refs up to date
  useEffect(() => {
    syncTaskToKanbanRef.current = syncTaskToKanban
    syncKanbanToTaskRef.current = syncKanbanToTask
  }, [syncTaskToKanban, syncKanbanToTask])

  // Initialize tracking only once per editor instance
  useEffect(() => {
    if (!editor || !enabled) {
      trackingInitializedRef.current = false
      return
    }

    // Only initialize if not already done for this editor
    if (trackingInitializedRef.current) return
    trackingInitializedRef.current = true

    // Initialize tracking for existing linked tasks
    const linkedTasks = findLinkedTaskItems(editor)
    for (const task of linkedTasks) {
      previousTaskContentsRef.current.set(task.kanbanCardId, {
        content: task.content,
        checked: task.checked
      })
    }

    // Initialize tracking for existing Kanban cards (content and column)
    const linkedCards = findLinkedKanbanCards(editor)
    linkedCards.forEach((cardInfo, cardId) => {
      previousKanbanContentsRef.current.set(cardId, cardInfo.card.content)
      previousKanbanColumnsRef.current.set(cardId, cardInfo.columnId)
    })
  }, [editor, enabled])

  // Subscribe to editor transactions for sync (separate effect to avoid reinitializing tracking)
  useEffect(() => {
    if (!editor || !enabled) return

    // Debounced sync on transaction
    let syncTimeout: NodeJS.Timeout | null = null

    const handleTransaction = () => {
      // Ignore transactions that happen shortly after a sync made changes
      // This prevents the sync from re-triggering on its own editor modifications
      const timeSinceLastChange = Date.now() - lastSyncChangeTimeRef.current
      if (timeSinceLastChange < 100) {
        return
      }

      if (syncTimeout) clearTimeout(syncTimeout)

      syncTimeout = setTimeout(() => {
        // Double-check we're not in a sync-triggered transaction window
        const timeSinceChange = Date.now() - lastSyncChangeTimeRef.current
        if (timeSinceChange < 150) {
          return
        }

        // Use refs to get latest functions without triggering effect reruns
        syncTaskToKanbanRef.current()
        syncKanbanToTaskRef.current()
      }, 350)
    }

    editor.on('transaction', handleTransaction)

    return () => {
      editor.off('transaction', handleTransaction)
      if (syncTimeout) clearTimeout(syncTimeout)
    }
  }, [editor, enabled])

  return {
    addTaskToKanban,
    unlinkTask,
    findKanbanBoards,
    syncTaskToKanban,
    syncKanbanToTask
  }
}

export default useTaskKanbanSync
