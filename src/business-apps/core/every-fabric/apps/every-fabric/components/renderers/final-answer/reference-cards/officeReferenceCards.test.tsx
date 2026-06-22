/**
 * Office content cards (document / slide / note / spreadsheet): each renders a
 * loading skeleton, then the fetched record's title + type-specific facts, and
 * falls back to the reference label when the fetch yields nothing.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key })
  }
})

const mockUseDocumentReference = jest.fn()
const mockUseSlideReference = jest.fn()
const mockUseNoteReference = jest.fn()
const mockUseSpreadsheetReference = jest.fn()

jest.mock('./hooks/officeReferenceHooks', () => ({
  __esModule: true,
  useDocumentReference: (...a: any[]) => mockUseDocumentReference(...a),
  useSlideReference: (...a: any[]) => mockUseSlideReference(...a),
  useNoteReference: (...a: any[]) => mockUseNoteReference(...a),
  useSpreadsheetReference: (...a: any[]) => mockUseSpreadsheetReference(...a)
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: () => '/office/x'
}))
jest.mock('@/common/utils/navigationUtils', () => ({ __esModule: true, navigateTo: jest.fn() }))
jest.mock('./IconTile', () => ({
  __esModule: true,
  IconTile: () => <span data-testid="icon-tile" />,
  tileGlyph: () => null
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/entities/EntityCard', () => ({
  __esModule: true,
  EntityCard: (props: any) => (
    <div data-testid="entity-card" data-loading={String(!!props.isLoading)}>
      <span data-testid="title">{props.title}</span>
      <span data-testid="subtitle">{props.subtitle}</span>
      <span data-testid="status">{props.status}</span>
      <span data-testid="description">{props.description}</span>
      <ul data-testid="fields">
        {(props.fields ?? []).map((f: any, i: number) => (
          <li key={i}>{`${f.label}=${f.value}`}</li>
        ))}
      </ul>
    </div>
  )
}))

import { DocumentReferenceCard } from './DocumentReferenceCard'
import { SlideReferenceCard } from './SlideReferenceCard'
import { NoteReferenceCard } from './NoteReferenceCard'
import { SpreadsheetReferenceCard } from './SpreadsheetReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref = (type: string, over: Partial<EntityReference> = {}): EntityReference => ({
  type,
  id: 'x-1',
  href: `${type}://x-1`,
  label: 'Fallback label',
  category: 'office',
  ...over
})

beforeEach(() => {
  mockUseDocumentReference.mockReset()
  mockUseSlideReference.mockReset()
  mockUseNoteReference.mockReset()
  mockUseSpreadsheetReference.mockReset()
})

describe('DocumentReferenceCard', () => {
  it('renders title, status, page count and a stripped description', () => {
    mockUseDocumentReference.mockReturnValue({
      loading: false,
      data: {
        title: 'Q3 Plan',
        status: 'pending_approval',
        updatedAt: new Date().toISOString(),
        description: '<p>Hello <b>world</b></p>',
        sourceFile: { pageCount: 12 }
      }
    })
    render(<DocumentReferenceCard reference={ref('document')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Q3 Plan')
    expect(screen.getByTestId('status')).toHaveTextContent('Pending Approval')
    expect(screen.getByTestId('description')).toHaveTextContent('Hello world')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-pages=renderer-ref-count-page')
  })

  it('shows a loading card and then falls back to the label', () => {
    mockUseDocumentReference.mockReturnValue({ loading: true, data: null })
    const { rerender } = render(<DocumentReferenceCard reference={ref('document')} accessToken="tok" />)
    expect(screen.getByTestId('entity-card')).toHaveAttribute('data-loading', 'true')

    mockUseDocumentReference.mockReturnValue({ loading: false, data: null })
    rerender(<DocumentReferenceCard reference={ref('document')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Fallback label')
  })
})

describe('SlideReferenceCard', () => {
  it('derives the slide count from contentJson.slides', () => {
    mockUseSlideReference.mockReturnValue({
      loading: false,
      data: { title: 'Pitch', status: 'draft', contentJson: { slides: [{}, {}, {}] } }
    })
    render(<SlideReferenceCard reference={ref('slide')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Pitch')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-slides=renderer-ref-count-slide')
  })
})

describe('NoteReferenceCard', () => {
  it('shows pinned status and a text preview', () => {
    mockUseNoteReference.mockReturnValue({
      loading: false,
      data: { title: 'Ideas', isPinned: true, content: '<div>Some note body</div>' }
    })
    render(<NoteReferenceCard reference={ref('note')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Ideas')
    expect(screen.getByTestId('status')).toHaveTextContent('renderer-ref-status-pinned')
    expect(screen.getByTestId('description')).toHaveTextContent('Some note body')
  })
})

describe('SpreadsheetReferenceCard', () => {
  it('renders sheet and row counts', () => {
    mockUseSpreadsheetReference.mockReturnValue({
      loading: false,
      data: {
        name: 'Budget',
        status: 'active',
        sheets: [{ data: [{}, {}] }, { data: [{}] }]
      }
    })
    render(<SpreadsheetReferenceCard reference={ref('spreadsheet')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Budget')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-sheets=renderer-ref-count-sheet')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-rows=renderer-ref-count-row')
  })
})
