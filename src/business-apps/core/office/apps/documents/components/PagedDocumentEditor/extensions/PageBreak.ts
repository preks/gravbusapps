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
        ({ chain, editor }) => {
          const inserted = chain().insertContent({ type: this.name }).run()
          // #region agent log
          if (typeof globalThis.fetch === 'function') {
            fetch('http://127.0.0.1:7702/ingest/91afea52-34bb-4fee-ae2c-a538b0bae61d', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a41470' },
              body: JSON.stringify({
                sessionId: 'a41470',
                runId: 'pre-fix',
                hypothesisId: 'H1',
                location: 'PageBreak.ts:71',
                message: 'page-break command executed',
                data: {
                  inserted,
                  hasRefreshCommand: typeof editor.commands.refreshPagesAndStabilize === 'function',
                  selectionFrom: editor.state.selection.from,
                  selectionTo: editor.state.selection.to
                },
                timestamp: Date.now()
              })
            }).catch(() => {})
          }
          // #endregion
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
