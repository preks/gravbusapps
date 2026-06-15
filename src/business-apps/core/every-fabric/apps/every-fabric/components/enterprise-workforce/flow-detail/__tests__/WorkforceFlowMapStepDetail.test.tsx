/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { WorkforceFlowMapStepDetail } from '../WorkforceFlowMapStepDetail'
import type { FlowDetailStep } from '../flowDetailTypes'

const mockUseFlowStepResult = jest.fn(() => ({ data: null, isLoading: false, error: null }))
jest.mock('../useFlowStepResult', () => ({
  useFlowStepResult: (options: unknown) => mockUseFlowStepResult(options as never)
}))
jest.mock('../FlowStepResult', () => ({
  FlowStepResult: () => <div data-testid="mock-step-result" />
}))

const steps: FlowDetailStep[] = [
  { stepIndex: 0, title: 'Fetch Quote & Rule Context', status: 'COMPLETED' },
  { stepIndex: 1, title: 'Score Risk Level', status: 'COMPLETED' }
]

describe('WorkforceFlowMapStepDetail', () => {
  beforeEach(() => mockUseFlowStepResult.mockClear())

  it('resolves a task node to its step reference and title', () => {
    render(
      <WorkforceFlowMapStepDetail nodeId="step-1" steps={steps} workflowId="wf" accessToken="t" onClose={jest.fn()} />
    )
    expect(screen.getByTestId('flow-map-step-detail')).toHaveTextContent('2. Score Risk Level')
    expect(screen.getByTestId('mock-step-result')).toBeInTheDocument()
    expect(mockUseFlowStepResult).toHaveBeenCalledWith(
      expect.objectContaining({ stepReference: 'step_1', enabled: true })
    )
  })

  it('maps the start node to the start reference', () => {
    render(
      <WorkforceFlowMapStepDetail nodeId="start" steps={steps} workflowId="wf" accessToken="t" onClose={jest.fn()} />
    )
    expect(mockUseFlowStepResult).toHaveBeenCalledWith(
      expect.objectContaining({ stepReference: 'start', enabled: true })
    )
  })

  it('shows an empty message for the end node and does not fetch', () => {
    render(
      <WorkforceFlowMapStepDetail nodeId="end" steps={steps} workflowId="wf" accessToken="t" onClose={jest.fn()} />
    )
    expect(screen.getByTestId('flow-map-step-detail-empty')).toBeInTheDocument()
    expect(mockUseFlowStepResult).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('invokes onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(
      <WorkforceFlowMapStepDetail nodeId="step-0" steps={steps} workflowId="wf" accessToken="t" onClose={onClose} />
    )
    fireEvent.click(screen.getByTestId('flow-map-step-detail-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
