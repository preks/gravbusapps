/**
 * PageBreak Extension for TipTap
 *
 * Adds page break functionality to the editor with proper
 * rendering and export support.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { TagParseRule } from '@tiptap/pm/model'

export interface PageBreakOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Insert a page break at the current position
       */
      setPageBreak: () => ReturnType
    }
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',
  priority: 1000,

  group: 'block',

  parseHTML(): readonly TagParseRule[] {
    return [{ tag: 'div[data-page-break]' }, { tag: 'hr.page-break', priority: 1000 }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-page-break': '',
          class: 'page-break',
          contenteditable: 'false'
        },
        HTMLAttributes
      ),
      ['div', { class: 'page-break-line' }],
      ['span', { class: 'page-break-label' }, 'Page Break']
    ]
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, editor }) => {
          const inserted = chain().insertContent({ type: this.name }).run()
          if (inserted) {
            editor.commands.refreshPagesAndStabilize?.()
          }
          return inserted
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak()
    }
  }
})

export default PageBreak
