import React from 'react'
import { render, screen } from '@testing-library/react'
import { PagedDocumentEditorStyles } from '../PagedDocumentEditorStyles'

describe('PagedDocumentEditorStyles', () => {
  it('renders the dynamic page color and prose min height into the style tag', () => {
    render(
      <div>
        <PagedDocumentEditorStyles pageColor="#fafafa" proseMinHeight={612} />
        <div data-testid="style-host" />
      </div>
    )

    const styleElement = screen.getByTestId('style-host').previousSibling
    expect(styleElement).toBeInstanceOf(HTMLStyleElement)
    expect(styleElement?.textContent).toContain('background-color: #fafafa;')
    expect(styleElement?.textContent).toContain('min-height: 612px;')
    expect(styleElement?.textContent).toContain('.document-editor-viewport[data-layout-window-mode="windowed"]')
  })
})
