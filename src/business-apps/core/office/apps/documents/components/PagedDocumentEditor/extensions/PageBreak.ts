/**
 * PageBreak Extension for TipTap
 *
 * Adds page break functionality to the editor with proper
 * rendering and export support.
 */

import { Node, mergeAttributes } from '@tiptap/core'

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

  parseHTML() {
    return [
      {
        tag: 'div[data-page-break]'
      },
      {
        tag: 'hr.page-break',
        priority: 1000
      },
      {
        style: 'page-break-after: always'
      },
      {
        style: 'page-break-before: always'
      }
    ]
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
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).run()
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
