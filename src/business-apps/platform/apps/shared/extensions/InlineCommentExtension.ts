/**
 * TipTap Inline Comment Extension
 *
 * Allows users to highlight text and add inline comments (like Google Docs).
 */

import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface InlineCommentOptions {
  HTMLAttributes: Record<string, unknown>
  onCommentClick?: (commentId: string) => void
}

export interface InlineCommentAttributes {
  commentId: string
  commentType: 'inline' | 'selection'
  createdBy: string
  createdAt: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineComment: {
      /**
       * Add an inline comment to the selected text
       */
      setInlineComment: (attributes: InlineCommentAttributes) => ReturnType
      /**
       * Remove inline comment
       */
      unsetInlineComment: () => ReturnType
      /**
       * Toggle inline comment
       */
      toggleInlineComment: (attributes: InlineCommentAttributes) => ReturnType
    }
  }
}

const InlineCommentPluginKey = new PluginKey('inlineComment')

/**
 * TipTap extension for inline comments
 */
export const InlineComment = Mark.create<InlineCommentOptions>({
  name: 'inlineComment',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentClick: undefined
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {}
          }

          return {
            'data-comment-id': attributes.commentId,
            'data-comment-type': attributes.commentType || 'inline',
            'data-created-by': attributes.createdBy,
            'data-created-at': attributes.createdAt
          }
        }
      },
      commentType: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-comment-type'),
        renderHTML: () => ({})
      },
      createdBy: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-by'),
        renderHTML: () => ({})
      },
      createdAt: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-at'),
        renderHTML: () => ({})
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'inline-comment',
        style:
          'background-color: rgba(255, 235, 59, 0.3); cursor: pointer; border-bottom: 2px solid rgba(255, 193, 7, 0.8);'
      }),
      0
    ]
  },

  addCommands() {
    return {
      setInlineComment:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetInlineComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      toggleInlineComment:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        }
    }
  },

  addProseMirrorPlugins() {
    const { onCommentClick } = this.options

    return [
      new Plugin({
        key: InlineCommentPluginKey,
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement

            // Check if clicked on an inline comment
            const commentId =
              target.getAttribute('data-comment-id') ||
              target.closest('[data-comment-id]')?.getAttribute('data-comment-id')

            if (commentId && onCommentClick) {
              onCommentClick(commentId)
              return true
            }

            return false
          }
        }
      })
    ]
  }
})
