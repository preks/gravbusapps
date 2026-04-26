import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { InlineRichTextEditor } from '../InlineRichTextEditor'
import type { TextElement } from '../slideElements'

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

    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' })

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

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })

    expect(onFinishEditing).toHaveBeenCalled()
  })
})
