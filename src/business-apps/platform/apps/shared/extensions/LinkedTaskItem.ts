/**
 * LinkedTaskItem Extension for TipTap
 * Extends TaskItem with Kanban card linking capabilities
 */

import TaskItem from '@tiptap/extension-task-item'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { LinkedTaskItemView } from '../../note-apps/components/LinkedTaskItemView'

export interface LinkedTaskItemOptions {
  nested: boolean
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkedTaskItem: {
      /**
       * Link a task item to a Kanban card
       */
      linkTaskToKanban: (options: { taskItemPos: number; kanbanId: string; kanbanCardId: string }) => ReturnType
      /**
       * Unlink a task item from its Kanban card
       */
      unlinkTaskFromKanban: (taskItemPos: number) => ReturnType
      /**
       * Update linked task item content (propagates to UI)
       */
      updateLinkedTaskDisplay: (taskItemPos: number) => ReturnType
    }
  }
}

export const LinkedTaskItem = TaskItem.extend<LinkedTaskItemOptions>({
  name: 'taskItem',

  addOptions() {
    return {
      ...this.parent?.(),
      nested: true,
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: element => element.getAttribute('data-checked') === 'true',
        renderHTML: attributes => ({
          'data-checked': attributes.checked
        })
      },
      kanbanCardId: {
        default: null,
        keepOnSplit: false, // New task items should NOT inherit kanban link
        parseHTML: element => element.getAttribute('data-kanban-card-id'),
        renderHTML: attributes => {
          if (!attributes.kanbanCardId) return {}
          return { 'data-kanban-card-id': attributes.kanbanCardId }
        }
      },
      kanbanId: {
        default: null,
        keepOnSplit: false, // New task items should NOT inherit kanban link
        parseHTML: element => element.getAttribute('data-kanban-id'),
        renderHTML: attributes => {
          if (!attributes.kanbanId) return {}
          return { 'data-kanban-id': attributes.kanbanId }
        }
      }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkedTaskItemView)
  },

  addCommands() {
    return {
      ...this.parent?.(),
      linkTaskToKanban:
        ({ taskItemPos, kanbanId, kanbanCardId }) =>
        ({ tr, state, dispatch }) => {
          const node = state.doc.nodeAt(taskItemPos)
          if (!node || node.type.name !== 'taskItem') {
            return false
          }

          if (dispatch) {
            tr.setNodeMarkup(taskItemPos, undefined, {
              ...node.attrs,
              kanbanId,
              kanbanCardId
            })
          }

          return true
        },
      unlinkTaskFromKanban:
        taskItemPos =>
        ({ tr, state, dispatch }) => {
          const node = state.doc.nodeAt(taskItemPos)
          if (!node || node.type.name !== 'taskItem') {
            return false
          }

          if (dispatch) {
            tr.setNodeMarkup(taskItemPos, undefined, {
              ...node.attrs,
              kanbanId: null,
              kanbanCardId: null
            })
          }

          return true
        },
      updateLinkedTaskDisplay:
        taskItemPos =>
        ({ tr, state, dispatch }) => {
          // This command triggers a transaction to force re-render
          // The actual display update is handled by the NodeView
          const node = state.doc.nodeAt(taskItemPos)
          if (!node || node.type.name !== 'taskItem') {
            return false
          }

          if (dispatch) {
            // Touch the node to trigger re-render
            tr.setNodeMarkup(taskItemPos, undefined, { ...node.attrs })
          }

          return true
        }
    }
  }
})

export default LinkedTaskItem
