/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'

import { FlowStepResult } from '../FlowStepResult'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'

jest.mock('../StepResultData', () => ({
  StepResultData: ({ formData }: { formData: Record<string, unknown> }) => (
    <div data-testid="step-result-data">{JSON.stringify(formData)}</div>
  )
}))

function response(): StepDataResponse {
  return {
    data: [
      {
        flowId: 'wf',
        taskId: 't1',
        userId: 'u1',
        userName: 'Ada Lovelace',
        timestamp: '2026-01-01T00:00:00Z',
        stepTitle: 'Score Risk',
        inputData: { risk: 'LOW' }
      }
    ],
    totalCount: 1,
    hasMore: false,
    stepIndex: 1,
    flowId: 'wf',
    pagination: { offset: 0, limit: 20 }
  }
}

describe('FlowStepResult', () => {
  it('shows a loading state', () => {
    render(<FlowStepResult data={null} isLoading error={null} />)
    expect(screen.getByTestId('flow-step-result-loading')).toHaveTextContent('flow-step-results-loading')
  })

  it('shows an error state', () => {
    render(<FlowStepResult data={null} isLoading={false} error="nope" />)
    expect(screen.getByTestId('flow-step-result-error')).toHaveTextContent('nope')
  })

  it('shows an empty state when there are no rows', () => {
    render(<FlowStepResult data={{ ...response(), data: [], totalCount: 0 }} isLoading={false} error={null} />)
    expect(screen.getByTestId('flow-step-result-empty')).toHaveTextContent('flow-step-result-empty')
  })

  it('renders the row actor and form data', () => {
    render(<FlowStepResult data={response()} isLoading={false} error={null} />)
    expect(screen.getByTestId('flow-step-result')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByTestId('step-result-data')).toHaveTextContent('LOW')
  })
})
