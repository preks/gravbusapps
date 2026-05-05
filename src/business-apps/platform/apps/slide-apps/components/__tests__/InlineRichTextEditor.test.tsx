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

function setDocumentSelection(range: Range) {
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

describe('InlineRichTextEditor', () => {
  it('exposes textbox semantics for the contenteditable editor', () => {
    render(
      <InlineRichTextEditor
        element={makeTextElement()}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
      />
    )

    expect(screen.getByTestId('inline-rich-text-editor')).toHaveAttribute('role', 'textbox')
    expect(screen.getByTestId('inline-rich-text-editor')).toHaveAttribute('aria-multiline', 'true')
  })

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

  it('routes copy events through the explicit clipboard callback', () => {
    const onCopySelection = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement()}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
        onCopySelection={onCopySelection}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const textNode = editor.querySelector('[data-run-start]')?.firstChild
    expect(textNode).toBeTruthy()

    const range = document.createRange()
    range.setStart(textNode as Text, 6)
    range.setEnd(textNode as Text, 11)
    setDocumentSelection(range)

    const clipboardData = { setData: jest.fn() } as unknown as DataTransfer
    fireEvent.copy(editor, { clipboardData })

    expect(onCopySelection).toHaveBeenCalledWith({ start: 6, end: 11 }, clipboardData)
  })

  it('routes paste events through the explicit clipboard callback instead of native mutation', () => {
    const onPasteSelection = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement()}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
        onPasteSelection={onPasteSelection}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const textNode = editor.querySelector('[data-run-start]')?.firstChild
    expect(textNode).toBeTruthy()

    const range = document.createRange()
    range.setStart(textNode as Text, 5)
    range.setEnd(textNode as Text, 5)
    setDocumentSelection(range)

    const clipboardData = {
      getData: jest.fn((type: string) => (type === 'text/plain' ? 'pasted text' : ''))
    } as unknown as DataTransfer
    fireEvent.paste(editor, { clipboardData })

    expect(onPasteSelection).toHaveBeenCalledWith({ start: 5, end: 5 }, clipboardData)
    expect(readEditorValue(editor)).toBe('Hello world')
  })

  it('renders bullet markers without serializing them back into the text value', () => {
    const onTextChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Inventing Enterprise Agents',
          paragraphs: [
            {
              bulletType: 'bullet',
              bulletChar: '→',
              indentLevel: 1,
              runs: [{ text: 'Inventing Enterprise Agents' }]
            }
          ]
        })}
        onTextChange={onTextChange}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const bullet = editor.querySelector<HTMLElement>('[data-editor-bullet="true"]')
    const paragraph = editor.querySelector<HTMLElement>('[data-paragraph-start]')

    expect(bullet).toHaveTextContent('→')
    expect(paragraph).toHaveStyle({ paddingLeft: '18px', display: 'flex' })

    fireEvent.input(editor)

    expect(onTextChange).toHaveBeenLastCalledWith('Inventing Enterprise Agents')
  })

  it('renders formatted numbering markers from paragraph metadata', () => {
    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'First\nSecond',
          paragraphs: [
            {
              bulletType: 'number',
              numberingStyle: 'romanUcPeriod',
              numberStartAt: 4,
              runs: [{ text: 'First' }]
            },
            {
              bulletType: 'number',
              numberingStyle: 'romanUcPeriod',
              runs: [{ text: 'Second' }]
            }
          ]
        })}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
      />
    )

    const bullets = Array.from(
      screen.getByTestId('inline-rich-text-editor').querySelectorAll<HTMLElement>('[data-editor-bullet="true"]')
    ).map(node => node.textContent)

    expect(bullets).toEqual(['IV.', 'V.'])
  })

  it('applies box-level letter spacing while editing', () => {
    render(
      <InlineRichTextEditor
        element={makeTextElement({ letterSpacing: 1.5 })}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
      />
    )

    expect(screen.getByTestId('inline-rich-text-editor')).toHaveStyle({ letterSpacing: '1.5px' })
  })

  it('does not render bullet markers for empty list paragraphs', () => {
    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: '',
          paragraphs: [{ bulletType: 'bullet', bulletChar: '•', runs: [{ text: '' }] }]
        })}
        onTextChange={() => {}}
        onSelectionChange={() => {}}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    expect(editor.querySelector('[data-editor-bullet="true"]')).toBeNull()
    expect(editor.querySelector('[data-paragraph-start]')).toHaveStyle({ display: 'block' })
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

  it('does not emit a synthetic end-of-text selection on initial mount', () => {
    const onSelectionChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Alpha\nBeta',
          paragraphs: [{ runs: [{ text: 'Alpha' }] }, { runs: [{ text: 'Beta' }] }]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    expect(onSelectionChange).not.toHaveBeenCalled()
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

  it('emits correct selection offsets when typing into an empty paragraph placeholder', () => {
    const onSelectionChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Alpha\n\nBeta',
          paragraphs: [{ runs: [{ text: 'Alpha' }] }, { runs: [{ text: '' }] }, { runs: [{ text: 'Beta' }] }]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const paragraphs = editor.querySelectorAll<HTMLElement>('[data-paragraph-start]')
    const emptyParagraph = paragraphs[1]

    expect(emptyParagraph).toBeDefined()

    onSelectionChange.mockClear()

    const placeholder = emptyParagraph.querySelector('[data-editor-placeholder="true"]')
    placeholder?.remove()

    const typedNode = document.createTextNode('s')
    emptyParagraph.appendChild(typedNode)

    const range = document.createRange()
    range.setStart(typedNode, 1)
    range.setEnd(typedNode, 1)
    setDocumentSelection(range)

    fireEvent.input(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 7, end: 7 })
  })

  it('emits correct selection offsets when the caret is on an element boundary inside an empty paragraph', () => {
    const onSelectionChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Alpha\n\nBeta',
          paragraphs: [{ runs: [{ text: 'Alpha' }] }, { runs: [{ text: '' }] }, { runs: [{ text: 'Beta' }] }]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const paragraphs = editor.querySelectorAll<HTMLElement>('[data-paragraph-start]')
    const emptyParagraph = paragraphs[1]

    expect(emptyParagraph).toBeDefined()

    onSelectionChange.mockClear()

    const placeholder = emptyParagraph.querySelector('[data-editor-placeholder="true"]')
    placeholder?.remove()

    const typedNode = document.createTextNode('s')
    emptyParagraph.appendChild(typedNode)

    const range = document.createRange()
    range.setStart(emptyParagraph, 1)
    range.setEnd(emptyParagraph, 1)
    setDocumentSelection(range)

    fireEvent.input(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 7, end: 7 })
  })

  it('keeps the caret offset at the true end of typed text in an empty bullet paragraph', () => {
    const onSelectionChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Alpha\n\nBeta',
          paragraphs: [
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'Alpha' }] },
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: '' }] },
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'Beta' }] }
          ]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const paragraphs = editor.querySelectorAll<HTMLElement>('[data-paragraph-start]')
    const emptyParagraph = paragraphs[1]
    onSelectionChange.mockClear()

    const placeholder = emptyParagraph.querySelector('[data-editor-placeholder="true"]')
    placeholder?.remove()

    const typedNode = document.createTextNode('sdddd')
    emptyParagraph.appendChild(typedNode)

    const range = document.createRange()
    range.setStart(emptyParagraph, emptyParagraph.childNodes.length)
    range.setEnd(emptyParagraph, emptyParagraph.childNodes.length)
    setDocumentSelection(range)

    fireEvent.input(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 11, end: 11 })
  })

  it('uses the live text-node length when a run span metadata is stale after further typing', () => {
    const onSelectionChange = jest.fn()

    render(
      <InlineRichTextEditor
        element={makeTextElement({
          content: 'Alpha\ns\nBeta',
          paragraphs: [
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'Alpha' }] },
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 's' }] },
            { bulletType: 'bullet', bulletChar: '•', runs: [{ text: 'Beta' }] }
          ]
        })}
        onTextChange={() => {}}
        onSelectionChange={onSelectionChange}
        onFinishEditing={() => {}}
      />
    )

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const secondParagraph = editor.querySelectorAll<HTMLElement>('[data-paragraph-start]')[1]
    const typedRun = secondParagraph.querySelector<HTMLElement>('[data-run-start]')

    expect(typedRun).toBeDefined()

    onSelectionChange.mockClear()

    const typedNode = typedRun.firstChild as Text
    typedNode.textContent = 'sdddd'

    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(typedNode, 5)
    range.setEnd(typedNode, 5)
    selection?.removeAllRanges()
    selection?.addRange(range)

    fireEvent.input(editor)

    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 11, end: 11 })
  })

  it('keeps the caret on the new paragraph when Enter is pressed at end of line 1', () => {
    const onSelectionChange = jest.fn()

    function Harness() {
      const [element, setElement] = useState(
        makeTextElement({
          content: 'Alpha',
          paragraphs: [{ runs: [{ text: 'Alpha' }] }]
        })
      )

      return (
        <>
          <InlineRichTextEditor
            element={element}
            onTextChange={value => {
              setElement(previous => replaceRichTextContent(previous, value))
            }}
            onSelectionChange={onSelectionChange}
            onFinishEditing={() => {}}
          />
          <div data-testid="editor-content">{element.content}</div>
        </>
      )
    }

    render(<Harness />)

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const firstRun = editor.querySelector<HTMLElement>('[data-run-start]')
    const firstTextNode = firstRun?.firstChild as Text
    const range = document.createRange()

    range.setStart(firstTextNode, 5)
    range.setEnd(firstTextNode, 5)
    setDocumentSelection(range)

    fireEvent.keyDown(editor, { key: 'Enter' })

    expect(screen.getByTestId('editor-content').textContent).toBe('Alpha\n')
    expect(onSelectionChange).toHaveBeenLastCalledWith({ start: 6, end: 6 })
  })

  it('inserts a new paragraph after all live typed text when run metadata is stale', () => {
    function Harness() {
      const [element, setElement] = useState(
        makeTextElement({
          content: 'a',
          paragraphs: [{ runs: [{ text: 'a' }] }]
        })
      )

      return (
        <>
          <InlineRichTextEditor
            element={element}
            onTextChange={value => {
              setElement(previous => replaceRichTextContent(previous, value))
            }}
            onSelectionChange={() => {}}
            onFinishEditing={() => {}}
          />
          <div data-testid="editor-content">{element.content}</div>
        </>
      )
    }

    render(<Harness />)

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const firstRun = editor.querySelector<HTMLElement>('[data-run-start]')
    const firstTextNode = firstRun?.firstChild as Text

    firstTextNode.textContent = 'asdsadsadas'

    const typingRange = document.createRange()
    typingRange.setStart(firstTextNode, 'asdsadsadas'.length)
    typingRange.setEnd(firstTextNode, 'asdsadsadas'.length)
    setDocumentSelection(typingRange)

    fireEvent.input(editor)
    fireEvent.keyDown(editor, { key: 'Enter' })

    expect(screen.getByTestId('editor-content').textContent).toBe('asdsadsadas\n')
  })

  it('preserves all typed characters after pressing Enter into a new paragraph', () => {
    function Harness() {
      const [element, setElement] = useState(
        makeTextElement({
          content: 'Alpha',
          paragraphs: [{ runs: [{ text: 'Alpha' }] }]
        })
      )
      const [rehydrateToken, setRehydrateToken] = useState(0)

      return (
        <>
          <InlineRichTextEditor
            element={element}
            rehydrateToken={rehydrateToken}
            onTextChange={value => {
              setElement(previous => {
                if (previous.content.split('\n').length !== value.split('\n').length) {
                  setRehydrateToken(currentToken => currentToken + 1)
                }

                return replaceRichTextContent(previous, value)
              })
            }}
            onSelectionChange={() => {}}
            onFinishEditing={() => {}}
          />
          <div data-testid="editor-content">{element.content}</div>
        </>
      )
    }

    render(<Harness />)

    const editor = screen.getByTestId('inline-rich-text-editor') as HTMLDivElement
    const firstRun = editor.querySelector<HTMLElement>('[data-run-start]')
    const firstTextNode = firstRun?.firstChild as Text
    const enterRange = document.createRange()

    enterRange.setStart(firstTextNode, 5)
    enterRange.setEnd(firstTextNode, 5)
    setDocumentSelection(enterRange)

    fireEvent.keyDown(editor, { key: 'Enter' })

    const secondParagraph = editor.querySelectorAll<HTMLElement>('[data-paragraph-start]')[1]
    const placeholder = secondParagraph.querySelector('[data-editor-placeholder="true"]')
    placeholder?.remove()

    const typedNode = document.createTextNode('sdddd')
    secondParagraph.appendChild(typedNode)

    const typingRange = document.createRange()
    typingRange.setStart(secondParagraph, secondParagraph.childNodes.length)
    typingRange.setEnd(secondParagraph, secondParagraph.childNodes.length)
    setDocumentSelection(typingRange)

    fireEvent.input(editor)

    expect(screen.getByTestId('editor-content').textContent).toBe('Alpha\nsdddd')
  })
})
