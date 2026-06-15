/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { FlowStepRow } from '../FlowStepRow'
import type { FlowDetailStep } from '../flowDetailTypes'

const mockUseFlowStepResult = jest.fn(() => ({ data: null, isLoading: false, error: null }))
jest.mock('../useFlowStepResult', () => ({
  useFlowStepResult: (options: unknown) => mockUseFlowStepResult(options as never)
}))
jest.mock('../FlowStepResult', () => ({
  FlowStepResult: () => <div data-testid="mock-step-result" />
}))

function step(overrides: Partial<FlowDetailStep> = {}): FlowDetailStep {
  return { stepIndex: 0, title: 'Score Risk Level', type: 'FUNCTION', status: 'COMPLETED', ...overrides }
}

function renderRow(stepOverrides: Partial<FlowDetailStep> = {}) {
  return render(
    <ul>
      <FlowStepRow step={step(stepOverrides)} nameByStep={new Map()} workflowId="wf" accessToken="t" />
    </ul>
  )
}

describe('FlowStepRow', () => {
  beforeEach(() => mockUseFlowStepResult.mockClear())

  it('hides results until the toggle is clicked, then loads step_0 data', () => {
    renderRow()
    expect(screen.queryByTestId('mock-step-result')).not.toBeInTheDocument()
    expect(mockUseFlowStepResult).toHaveBeenCalledWith(
      expect.objectContaining({ stepReference: 'step_0', enabled: false })
    )

    fireEvent.click(screen.getByTestId('flow-step-results-toggle'))

    expect(screen.getByTestId('mock-step-result')).toBeInTheDocument()
    expect(mockUseFlowStepResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ stepReference: 'step_0', enabled: true })
    )
  })

  it('does not offer results for steps that cannot have any yet', () => {
    renderRow({ status: 'QUEUED' })
    expect(screen.queryByTestId('flow-step-results-toggle')).not.toBeInTheDocument()
  })

  it('does not offer results without a workflow id', () => {
    render(
      <ul>
        <FlowStepRow step={step()} nameByStep={new Map()} accessToken="t" />
      </ul>
    )
    expect(screen.queryByTestId('flow-step-results-toggle')).not.toBeInTheDocument()
  })
})
