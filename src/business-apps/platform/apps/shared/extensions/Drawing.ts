/**
 * Drawing Extension for TipTap
 * Allows inserting SVG drawings into the editor
 */

import { Node, mergeAttributes } from '@tiptap/core'

export interface DrawingOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      /**
       * Insert a drawing
       */
      insertDrawing: (options: { id: string; svgData: string }) => ReturnType
    }
  }
}

export const Drawing = Node.create<DrawingOptions>({
  name: 'drawing',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-drawing-id'),
        renderHTML: attributes => ({ 'data-drawing-id': attributes.id })
      },
      svgData: {
        default: null,
        parseHTML: element => element.getAttribute('data-svg'),
        renderHTML: attributes => ({ 'data-svg': attributes.svgData })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-drawing-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const svgData = HTMLAttributes['data-svg'] as string | undefined

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'drawing-node',
        contenteditable: 'false'
      }),
      svgData
        ? [
            'div',
            {
              class: 'drawing-content',
              innerHTML: svgData
            }
          ]
        : ['div', { class: 'drawing-placeholder' }, 'Drawing']
    ]
  },

  addCommands() {
    return {
      insertDrawing:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          })
        }
    }
  }
})

export default Drawing
