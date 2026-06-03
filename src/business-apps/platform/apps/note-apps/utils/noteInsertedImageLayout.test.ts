import type { Editor } from '@tiptap/core'
import { NOTE_EDITOR_CONTENT_FALLBACK_WIDTH_PX, resolveNoteEditorAvailableWidthPx } from './noteInsertedImageLayout'

describe('noteInsertedImageLayout', () => {
  it('resolveNoteEditorAvailableWidthPx prefers local block width', () => {
    const paragraph = document.createElement('p')
    Object.defineProperty(paragraph, 'clientWidth', { configurable: true, value: 640 })

    const dom = document.createElement('div')
    dom.appendChild(paragraph)
    document.body.appendChild(dom)

    const text = document.createTextNode('hello')
    paragraph.appendChild(text)

    const editor = {
      view: {
        dom,
        domAtPos: () => ({ node: text, offset: 0 })
      }
    } as unknown as Editor

    expect(resolveNoteEditorAvailableWidthPx(editor, 1)).toBe(640)
    dom.remove()
  })

  it('resolveNoteEditorAvailableWidthPx falls back to editor client width', () => {
    const dom = document.createElement('div')
    Object.defineProperty(dom, 'clientWidth', { configurable: true, value: 900 })

    const editor = {
      view: {
        dom,
        domAtPos: () => {
          throw new Error('no position')
        }
      }
    } as unknown as Editor

    expect(resolveNoteEditorAvailableWidthPx(editor, 1)).toBe(900)
  })

  it('resolveNoteEditorAvailableWidthPx uses content fallback when measurement fails', () => {
    const dom = document.createElement('div')
    Object.defineProperty(dom, 'clientWidth', { configurable: true, value: 0 })

    const editor = {
      view: {
        dom,
        domAtPos: () => {
          throw new Error('no position')
        }
      }
    } as unknown as Editor

    expect(resolveNoteEditorAvailableWidthPx(editor, 1)).toBe(NOTE_EDITOR_CONTENT_FALLBACK_WIDTH_PX)
  })
})
