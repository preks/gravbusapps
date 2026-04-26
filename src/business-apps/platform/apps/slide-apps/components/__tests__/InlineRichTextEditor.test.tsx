import React, { useCallback, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { InlineRichTextEditor } from '../InlineRichTextEditor'
import type { TextElement } from '../slideElements'
import { replaceRichTextContent } from '../../utils/richTextEditing'

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 300, height: 120 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    verticalAlign: 'top',
    color: '#111111',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
    letterSpacing: 0,
    padding: 0,
    ...overrides
  }
}

function readEditorValue(editor: HTMLDivElement): string {
  return editor.innerText ?? editor.textContent ?? ''
}

describe('InlineRichTextEditor', () => {
  it('keeps Space key events inside the editor', () => {
    const parentKeyDown = jest.fn()

    render(
      <div onKeyDown={parentKeyDown}>
        <InlineRichTextEditor
          element={makeTextElement()}
          onTextChange={() => {}}
          onSelectionChange={() => {}}
          onFinishEditing={() => {}}
        />
      </div>
    )

    fireEvent.keyDown(screen.getByTestId('inline-rich-text-editor'), { key: ' ' })

    expect(parentKeyDown).not.toHaveBeenCalled()
  })

  it('exits editing on Escape', () => {
    const onFinishEditing = jest.fn()
    render(
      <InlineRichTextEditor
        element={makeTextElement()}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={onFinishEditing}
      />
    )

    fireEvent.keyDown(screen.getByTestId('inline-rich-text-editor'), { key: 'Escape' })

    expect(onFinishEditing).toHaveBeenCalled()
  })

  it('keeps deleting a leading empty paragraph stable while parent state updates live', () => {
    function Harness() {
      const handleSelectionChange = useCallback(() => {}, [])
      const [element, setElement] = useState(
        makeTextElement({
          content: '\nThe\nNEWWORK Enterprise AI.',
          paragraphs: [
            { runs: [{ text: '' }] },
            { runs: [{ text: 'The ' }] },
            { runs: [{ text: 'NEWWORK Enterprise AI.' }] }
          ]
        })
      )

      return (
        <InlineRichTextEditor
          element={element}
          onTextChange={value => {
            setElement(previous => replaceRichTextContent(previous, value))
          }}
          onSelectionChange={handleSelectionChange}
          onFinishEditing={() => {}}
        />
      )
    }

    render(<Harness />)

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement

    act(() => {
      editor.innerText = 'The\nNEWWORK Enterprise AI.'
      expect(() => {
        fireEvent.input(editor)
      }).not.toThrow()
    })

    expect(readEditorValue(editor)).toBe('The\nNEWWORK Enterprise AI.')
  })

  it('rehydrates the editor only when the rehydrate token changes', () => {
    function Harness() {
      const handleSelectionChange = useCallback(() => {}, [])
      const [element, setElement] = useState(
        makeTextElement({
          content: 'Initial value',
          paragraphs: [{ runs: [{ text: 'Initial value' }] }]
        })
      )
      const [token, setToken] = useState(0)

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setElement(previous => replaceRichTextContent(previous, 'Formatted value'))
            }}
          >
            update-without-token
          </button>
          <button
            type="button"
            onClick={() => {
              setElement(previous => replaceRichTextContent(previous, 'Formatted value'))
              setToken(previous => previous + 1)
            }}
          >
            update-with-token
          </button>
          <InlineRichTextEditor
            element={element}
            rehydrateToken={token}
            onTextChange={() => {}}
            onSelectionChange={handleSelectionChange}
            onFinishEditing={() => {}}
          />
        </>
      )
    }

    render(<Harness />)

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement

    fireEvent.click(screen.getByText('update-without-token'))
    expect(readEditorValue(editor)).toBe('Initial value')

    fireEvent.click(screen.getByText('update-with-token'))
    expect(readEditorValue(editor)).toBe('Formatted value')
  })

  it('emits correct selection offsets for text on the second paragraph', () => {
    const onSelectionChange = jest.fn()
    const firstLine = 'The sds'
    const secondLine = 'NEWWORK Enterprise AI.'

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: `${firstLine}\n${secondLine}`,
          paragraphs: [{ runs: [{ text: firstLine }] }, { runs: [{ text: secondLine }] }]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const secondRun = editor.querySelectorAll<HTMLElement>('[data-run-start]')[1]

    expect(secondRun).toBeDefined()

    onSelectionChange.mockClear()

    const selection = window.getSelection()
    const range = document.createRange()
    const secondTextNode = secondRun.firstChild as Text
    range.setStart(secondTextNode, 0)
    range.setEnd(secondTextNode, secondLine.length)
    selection?.removeAllRanges()
    selection?.addRange(range)

    fireEvent.mouseUp(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      start: firstLine.length + 1,
      end: firstLine.length + 1 + secondLine.length
    })
  })
})
