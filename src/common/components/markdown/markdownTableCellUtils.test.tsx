import React from 'react'
import { render, screen } from '@testing-library/react'
import { buildMarkdownTableCellBody, getTableCellText } from './markdownTableCellUtils'

describe('getTableCellText', () => {
  it('extracts text from nested React element children (entity chip links)', () => {
    const chip = <a href="employee://08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f">Daniel Vorberg</a>
    expect(getTableCellText(chip).trim()).toBe('Daniel Vorberg')
  })

  it('joins text from mixed string and element children', () => {
    const mixed = ['Prefix ', <strong key="s">bold</strong>, ' suffix']
    expect(getTableCellText(mixed).trim()).toBe('Prefix bold suffix')
  })

  it('returns empty string for null or boolean children', () => {
    expect(getTableCellText(null).trim()).toBe('')
    expect(getTableCellText(false).trim()).toBe('')
  })
})

describe('buildMarkdownTableCellBody', () => {
  it('renders chip children instead of empty placeholder when cell has only a link element', () => {
    const chip = <span data-testid="entity-chip">Daniel Vorberg</span>
    const { cellBody, isEmpty } = buildMarkdownTableCellBody({ children: chip })

    expect(isEmpty).toBe(false)
    render(<>{cellBody}</>)
    expect(screen.getByTestId('entity-chip')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders em dash placeholder for truly empty cells', () => {
    const { cellBody, isEmpty } = buildMarkdownTableCellBody({ children: null })

    expect(isEmpty).toBe(true)
    render(<>{cellBody}</>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
