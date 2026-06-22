/**
 * GenericReferenceCard: humanizes the type, surfaces the intent context label,
 * and opens the record via the shared protocol -> URL resolver.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const mockNavigateTo = jest.fn()

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key })
  }
})

jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: (type: string, id: string) => `/open/${type}/${id}`
}))
jest.mock('@/common/utils/navigationUtils', () => ({
  __esModule: true,
  navigateTo: (...args: any[]) => mockNavigateTo(...args)
}))

jest.mock('@/business-apps/platform/apps/every-ai/components/entities/EntityCard', () => ({
  __esModule: true,
  EntityCard: (props: any) => (
    <button data-testid="entity-card" onClick={props.onClick}>
      <span data-testid="title">{props.title}</span>
      <span data-testid="subtitle">{props.subtitle}</span>
    </button>
  )
}))

import { GenericReferenceCard } from './GenericReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref = (over: Partial<EntityReference> = {}): EntityReference => ({
  type: 'document',
  id: 'doc-1',
  href: 'document://doc-1',
  label: 'Q3 Report',
  category: 'document',
  ...over
})

describe('GenericReferenceCard', () => {
  beforeEach(() => mockNavigateTo.mockReset())

  it('renders the label and humanized type', () => {
    render(<GenericReferenceCard reference={ref({ type: 'service_workflow' })} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Q3 Report')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Service Workflow')
  })

  it('navigates to the resolved URL on click', () => {
    render(<GenericReferenceCard reference={ref()} accessToken="tok" />)
    fireEvent.click(screen.getByTestId('entity-card'))
    expect(mockNavigateTo).toHaveBeenCalledWith('/open/document/doc-1')
  })

  it('prepends the intent context label to the subtitle', () => {
    render(<GenericReferenceCard reference={ref({ intent: 'owner' })} accessToken="tok" />)
    expect(screen.getByTestId('subtitle')).toHaveTextContent('renderer-ref-intent-owner · Document')
  })
})
