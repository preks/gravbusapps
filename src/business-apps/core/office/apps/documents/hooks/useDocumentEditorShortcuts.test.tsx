import { renderHook } from '@testing-library/react'
import { useDocumentEditorShortcuts } from './useDocumentEditorShortcuts'

describe('useDocumentEditorShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does not intercept right click events anymore', () => {
    const editorContainer = document.createElement('div')
    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    editorContainer.appendChild(proseMirror)

    const onSave = jest.fn()
    const onAddInlineComment = jest.fn()

    renderHook(() =>
      useDocumentEditorShortcuts({
        onSave,
        onAddInlineComment,
        editorContainerRef: {
          current: editorContainer
        }
      })
    )

    proseMirror.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))

    expect(onAddInlineComment).not.toHaveBeenCalled()
  })

  it('opens AI edit with Cmd/Ctrl+Shift+E when the editor is focused', () => {
    const editorContainer = document.createElement('div')
    const editorButton = document.createElement('button')
    editorContainer.appendChild(editorButton)
    document.body.appendChild(editorContainer)

    const onSave = jest.fn()
    const onAddInlineComment = jest.fn()
    const onAiEdit = jest.fn()

    renderHook(() =>
      useDocumentEditorShortcuts({
        onSave,
        onAddInlineComment,
        onAiEdit,
        editorContainerRef: {
          current: editorContainer
        }
      })
    )

    editorButton.focus()
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'E', metaKey: true, shiftKey: true })
    )

    expect(onAiEdit).toHaveBeenCalledTimes(1)
  })

  it('does not open AI edit with Cmd/Ctrl+Shift+E when focus is outside the editor', () => {
    const editorContainer = document.createElement('div')
    const outsideButton = document.createElement('button')
    document.body.appendChild(editorContainer)
    document.body.appendChild(outsideButton)

    const onSave = jest.fn()
    const onAddInlineComment = jest.fn()
    const onAiEdit = jest.fn()

    renderHook(() =>
      useDocumentEditorShortcuts({
        onSave,
        onAddInlineComment,
        onAiEdit,
        editorContainerRef: {
          current: editorContainer
        }
      })
    )

    outsideButton.focus()
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'E', metaKey: true, shiftKey: true })
    )

    expect(onAiEdit).not.toHaveBeenCalled()
  })
})
