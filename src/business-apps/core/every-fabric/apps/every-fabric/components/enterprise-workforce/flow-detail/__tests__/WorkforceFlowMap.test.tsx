/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { WorkforceFlowMap } from '../WorkforceFlowMap'

jest.mock('@/common/components/flow/ReadonlyTemplateFlowCanvas', () => ({
  ReadonlyTemplateFlowCanvas: (props: { title: string; onNodeSelect?: (nodeId: string | null) => void }) => (
    <div data-testid="flow-map-canvas">
      {props.title}
      {props.onNodeSelect && (
        <button type="button" data-testid="mock-node-click" onClick={() => props.onNodeSelect?.('step-1')}>
          select node
        </button>
      )}
    </div>
  )
}))

jest.mock('../WorkforceFlowMapStepDetail', () => ({
  WorkforceFlowMapStepDetail: (props: { nodeId: string; onClose: () => void }) => (
    <div data-testid="flow-map-step-detail">
      {props.nodeId}
      <button type="button" data-testid="mock-step-detail-close" onClick={props.onClose}>
        close
      </button>
    </div>
  )
}))

const mockExec = jest.fn()
const mockReplay = jest.fn()
jest.mock('../useFlowExecutionState', () => ({ useFlowExecutionState: (options: unknown) => mockExec(options) }))
jest.mock('../useFlowReplay', () => ({
  useFlowReplay: (overview: unknown) => mockReplay(overview),
  REPLAY_SPEEDS: [0.5, 1, 2]
}))

function baseExec(overrides: Record<string, unknown> = {}) {
  return {
    overview: { id: 'wf', status: 'RUNNING', steps: [], progress: { currentStep: 2, totalSteps: 4, percentage: 50 } },
    status: { code: 'RUNNING', label: 'Running', variant: 'running' },
    executionState: { nodeStates: {} },
    isLoading: false,
    error: null,
    ...overrides
  }
}

function baseReplay(overrides: Record<string, unknown> = {}) {
  return {
    frame: null,
    hasReplay: true,
    frameIndex: 0,
    frameCount: 4,
    isPlaying: false,
    currentStepTitle: 'Fetch',
    speed: 1,
    play: jest.fn(),
    pause: jest.fn(),
    toggle: jest.fn(),
    restart: jest.fn(),
    stepForward: jest.fn(),
    stepBack: jest.fn(),
    seek: jest.fn(),
    setSpeed: jest.fn(),
    ...overrides
  }
}

function renderMap() {
  return render(
    <WorkforceFlowMap workflowId="wf" templateId="tpl" workflowName="Enpal Quote Validation" accessToken="token" />
  )
}

describe('WorkforceFlowMap', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockReplay.mockReset()
  })

  it('renders the canvas, legend and replay controls', () => {
    mockExec.mockReturnValue(baseExec())
    mockReplay.mockReturnValue(baseReplay())
    renderMap()

    expect(screen.getByTestId('flow-map-canvas')).toHaveTextContent('Enpal Quote Validation')
    expect(screen.getByTestId('flow-map-legend')).toBeInTheDocument()
    expect(screen.getByTestId('flow-map-replay-controls')).toBeInTheDocument()
    expect(screen.getByTestId('flow-map-summary')).toBeInTheDocument()
    expect(screen.getAllByTestId('flow-map-status')[0]).toHaveAttribute('data-status-code', 'RUNNING')
  })

  it('hides replay controls when there is nothing to replay', () => {
    mockExec.mockReturnValue(baseExec())
    mockReplay.mockReturnValue(baseReplay({ hasReplay: false }))
    renderMap()

    expect(screen.queryByTestId('flow-map-replay-controls')).not.toBeInTheDocument()
  })

  it('toggles fullscreen', () => {
    mockExec.mockReturnValue(baseExec())
    mockReplay.mockReturnValue(baseReplay())
    renderMap()

    expect(screen.getByTestId('workforce-flow-map')).toHaveAttribute('data-fullscreen', 'false')
    fireEvent.click(screen.getByTestId('flow-map-fullscreen-toggle'))
    // The fullscreen overlay is portaled to document.body, so re-query rather
    // than reuse the pre-toggle (now unmounted) node.
    expect(screen.getByTestId('workforce-flow-map')).toHaveAttribute('data-fullscreen', 'true')
  })

  it('shows the replay step label while replaying', () => {
    mockExec.mockReturnValue(baseExec())
    mockReplay.mockReturnValue(baseReplay({ frameIndex: 1, isPlaying: true, currentStepTitle: 'Score' }))
    renderMap()

    expect(screen.getByTestId('flow-map-step-label')).toHaveTextContent('Step 2 of 4')
    expect(screen.getByTestId('flow-map-step-label')).toHaveTextContent('Score')
  })

  it('opens and closes the step detail panel when a node is selected', () => {
    mockExec.mockReturnValue(baseExec())
    mockReplay.mockReturnValue(baseReplay())
    renderMap()

    expect(screen.queryByTestId('flow-map-step-detail')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mock-node-click'))
    expect(screen.getByTestId('flow-map-step-detail')).toHaveTextContent('step-1')

    fireEvent.click(screen.getByTestId('mock-step-detail-close'))
    expect(screen.queryByTestId('flow-map-step-detail')).not.toBeInTheDocument()
  })
})
