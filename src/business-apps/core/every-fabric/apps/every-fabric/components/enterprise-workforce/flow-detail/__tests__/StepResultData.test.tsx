/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'

import { StepResultData } from '../StepResultData'

jest.mock('@/common/components/flow/flow-detail/tabs/stepDataRendering', () => ({
  FieldValueDisplay: ({ value }: { value: unknown }) => (
    <span data-testid="leaf">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
  ),
  generateFieldLabel: (key: string) => key,
  isFileLikeValue: () => false
}))

describe('StepResultData', () => {
  it('flattens nested wrapper objects into leaf rows instead of raw JSON', () => {
    render(
      <StepResultData
        formData={{
          Response: {
            body: {
              result: { quote_id: '00000115', status: 'Activated' }
            }
          }
        }}
      />
    )

    expect(screen.queryByText('Response')).not.toBeInTheDocument()
    expect(screen.queryByText('body')).not.toBeInTheDocument()
    expect(screen.getByText('quote_id')).toBeInTheDocument()
    expect(screen.getByText('status')).toBeInTheDocument()

    const leaves = screen.getAllByTestId('leaf').map(node => node.textContent)
    expect(leaves).toContain('00000115')
    expect(leaves).toContain('Activated')
  })

  it('renders arrays of objects as separate entries', () => {
    render(
      <StepResultData
        formData={{
          violations: [
            { rule_id: 'R005', severity: 'low' },
            { rule_id: 'R010', severity: 'high' }
          ]
        }}
      />
    )

    expect(screen.getAllByText('rule_id').length).toBe(2)
    const leaves = screen.getAllByTestId('leaf').map(node => node.textContent)
    expect(leaves).toContain('R005')
    expect(leaves).toContain('R010')
  })

  it('parses JSON strings into nested structures', () => {
    render(<StepResultData formData={{ payload: '{"score":95,"band":"Excellent"}' }} />)

    expect(screen.getByText('score')).toBeInTheDocument()
    expect(screen.getByText('band')).toBeInTheDocument()
  })

  it('shows a placeholder when there is no data', () => {
    render(<StepResultData formData={{}} />)
    expect(screen.getByText('No data captured.')).toBeInTheDocument()
  })
})
