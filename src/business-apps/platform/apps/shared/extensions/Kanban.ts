/**
 * Kanban Extension for TipTap
 * Allows inserting kanban boards into the editor
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { KanbanBoard } from '../../note-apps/components/KanbanBoard'

export interface KanbanParticipant {
  userId: string
  userName: string
  userAvatar?: string
  userColor?: string
}

export interface KanbanOptions {
  HTMLAttributes: Record<string, unknown>
  participants?: KanbanParticipant[]
}

export type KanbanCardColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink'

export interface KanbanCard {
  id: string
  content: string
  assigneeId?: string
  /**
   * Snapshot to render assignee even if participant lookup fails.
   * (We still keep `assigneeId` as the canonical reference.)
   */
  assigneeName?: string
  assigneeAvatar?: string
  color?: KanbanCardColor
  /**
   * Reference to the linked task item in the document.
   * When set, this card is synced with a task item checkbox.
   */
  linkedTaskItemId?: string
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

export interface KanbanData {
  id: string
  columns: KanbanColumn[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    kanban: {
      /**
       * Insert a kanban board
       */
      insertKanban: (options?: { id?: string; data?: KanbanData }) => ReturnType
      /**
       * Update kanban board data
       */
      updateKanban: (id: string, data: KanbanData) => ReturnType
    }
  }
}

export const Kanban = Node.create<KanbanOptions>({
  name: 'kanban',

  group: 'block',

  atom: true,

  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      participants: [] as KanbanParticipant[]
    }
  },

  addStorage() {
    return {
      participants: [] as KanbanParticipant[]
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-kanban-id'),
        renderHTML: attributes => ({ 'data-kanban-id': attributes.id })
      },
      dataJson: {
        default: null,
        parseHTML: element => element.getAttribute('data-kanban-data'),
        renderHTML: attributes => {
          if (!attributes.dataJson) return {}
          return { 'data-kanban-data': attributes.dataJson }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-kanban-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'kanban-node',
        contenteditable: 'false'
      }),
      // Prevent sanitizers from dropping an empty div
      // Keep as plain text (no Tailwind class) so backend sanitizers don't remove it.
      // This placeholder is only visible if the React NodeView fails to render.
      ['span', { 'data-kanban-placeholder': '1' }, 'kanban']
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(KanbanBoard)
  },

  addCommands() {
    return {
      insertKanban:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const kanbanId = options?.id || `kanban-${Date.now()}`
          const defaultData: KanbanData = {
            id: kanbanId,
            columns: [
              { id: 'todo', title: 'To Do', cards: [] },
              { id: 'in-progress', title: 'In Progress', cards: [] },
              { id: 'done', title: 'Done', cards: [] }
            ]
          }

          const dataToPersist = options?.data || defaultData

          // Create actual ProseMirror nodes using the schema
          const kanbanNodeType = state.schema.nodes[this.name]
          const paragraphType = state.schema.nodes.paragraph

          if (!kanbanNodeType || !paragraphType) {
            console.error('[Kanban] Node types not found in schema')
            return false
          }

          const kanbanNode = kanbanNodeType.create({
            id: kanbanId,
            dataJson: JSON.stringify(dataToPersist)
          })

          const paragraphBefore = paragraphType.create()
          const paragraphAfter = paragraphType.create()

          // Get current selection position
          const { $from } = state.selection
          let insertPos = $from.end()

          // Find a valid position to insert block content
          // Try to insert after the current block
          try {
            const resolvedPos = state.doc.resolve(insertPos)
            // If we're inside a block, move to after it
            if (resolvedPos.depth > 0) {
              insertPos = resolvedPos.after(1)
            }
          } catch {
            // Fallback to end of document
            insertPos = state.doc.content.size
          }

          // Ensure position is valid
          if (insertPos > state.doc.content.size) {
            insertPos = state.doc.content.size
          }

          // Create a fragment with paragraph, kanban, paragraph
          const fragment = state.schema.nodes.doc.contentMatch.defaultType
            ? [paragraphBefore, kanbanNode, paragraphAfter]
            : [kanbanNode]

          if (dispatch) {
            // Use replaceWith to insert the nodes
            const newTr = tr.insert(insertPos, fragment)
            dispatch(newTr.scrollIntoView())
          }

          return true
        },
      updateKanban:
        (id, data) =>
        ({ tr, state }) => {
          const { doc } = state
          let found = false

          doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dataJson: JSON.stringify(data)
              })
              found = true
              return false
            }
          })

          return found
        }
    }
  }
})

export default Kanban
