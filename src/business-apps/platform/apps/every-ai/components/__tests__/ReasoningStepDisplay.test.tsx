/**
 * Render tests for `ReasoningStepDisplay` covering the two modes gated by
 * the `show_technical_reasoning` developer flag.
 *
 * - Technical mode (flag ON): legacy view with KIND badge, raw tool title,
 *   and expanded INPUT / OUTPUT / raw error sections.
 * - Friendly mode (flag OFF, default): single friendly headline, no badge,
 *   no inputs/outputs, generic soft-error line in place of stack traces.
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

// `OutputRenderers` transitively imports `@newwork/remote-component-loader`
// (an ESM-only build that Jest can't parse out of the box) and a number of
// other heavy display widgets we don't exercise here. Stub the loader so the
// transitive import chain is happy.
jest.mock('@newwork/remote-component-loader', () => ({
  injectImportProxy: jest.fn(),
  installDependenciesBootstrap: jest.fn(),
  loadRemoteComponentSimple: jest.fn(),
  removeRemoteComponentScript: jest.fn()
}))

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))

const mockUseShowTechnicalReasoning = jest.fn<boolean, []>()
jest.mock('../../hooks/useShowTechnicalReasoning', () => ({
  useShowTechnicalReasoning: () => mockUseShowTechnicalReasoning()
}))

import { ReasoningStepDisplay } from '../OutputRenderers'
import type { ReasoningStepOutput } from '../../types/models'

const baseStep: ReasoningStepOutput = {
  type: 'reasoning_step',
  id: 'rs_1',
  kind: 'tool_call',
  title: 'retrieve_information_from_documents',
  status: 'done',
  args: { query: 'something internal' },
  result: { hits: 3 },
  user_facing_title: 'Reading your uploaded documents',
  user_facing_summary: 'Reviewing "Travel Policy.pdf"'
}

beforeEach(() => {
  mockUseShowTechnicalReasoning.mockReset()
})

describe('ReasoningStepDisplay — technical mode (dev flag ON)', () => {
  beforeEach(() => {
    mockUseShowTechnicalReasoning.mockReturnValue(true)
  })

  it('shows the kind badge and the raw backend title', () => {
    render(<ReasoningStepDisplay step={baseStep} />)
    expect(screen.getByText('Tool')).toBeInTheDocument()
    expect(screen.getByText('retrieve_information_from_documents')).toBeInTheDocument()
  })

  it('does not show the friendly headline in place of the raw title', () => {
    render(<ReasoningStepDisplay step={baseStep} />)
    expect(screen.queryByText('Reading your uploaded documents')).not.toBeInTheDocument()
  })

  it('reveals raw Input and Output sections when expanded', () => {
    render(<ReasoningStepDisplay step={baseStep} />)
    fireEvent.click(screen.getByRole('button'))
    const body = screen.getByTestId('reasoning-step-body')
    expect(body).toHaveTextContent('Input')
    expect(body).toHaveTextContent('Output')
    expect(body).toHaveTextContent('something internal')
    expect(body).toHaveTextContent('hits')
  })

  it('shows the raw error string verbatim when the step errored', () => {
    const errorStep: ReasoningStepOutput = {
      ...baseStep,
      status: 'error',
      error: 'TypeError: cannot read property "x" of undefined'
    }
    render(<ReasoningStepDisplay step={errorStep} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('reasoning-step-body')).toHaveTextContent(
      'TypeError: cannot read property "x" of undefined'
    )
    expect(screen.queryByTestId('reasoning-step-friendly-error')).not.toBeInTheDocument()
  })
})

describe('ReasoningStepDisplay — friendly mode (dev flag OFF, default)', () => {
  beforeEach(() => {
    mockUseShowTechnicalReasoning.mockReturnValue(false)
  })

  it('shows the friendly headline and hides the kind badge and raw title', () => {
    render(<ReasoningStepDisplay step={baseStep} />)
    expect(screen.getByText('Reading your uploaded documents')).toBeInTheDocument()
    expect(screen.queryByText('Tool')).not.toBeInTheDocument()
    expect(screen.queryByText('retrieve_information_from_documents')).not.toBeInTheDocument()
  })

  it('shows the friendly summary inline for a RUNNING step', () => {
    // While the agent is mid-flight the user needs to see what's happening
    // without clicking — the subtitle must be visible inline.
    const running: ReasoningStepOutput = { ...baseStep, status: 'running' }
    render(<ReasoningStepDisplay step={running} />)
    expect(screen.getByTestId('reasoning-step-description')).toHaveTextContent('Reviewing "Travel Policy.pdf"')
  })

  it('HIDES the inline subtitle once a step is DONE (avoid stacking duplicates)', () => {
    // Otherwise every completed step in the trail leaves its subtitle
    // floating below the title forever, and re-shows the same text the
    // moment the user expands the row. Done steps render as just the
    // title + check; the subtitle re-appears inside the expanded body.
    render(<ReasoningStepDisplay step={baseStep} />)
    expect(screen.queryByTestId('reasoning-step-description')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('reasoning-step-friendly-summary')).toHaveTextContent('Reviewing "Travel Policy.pdf"')
  })

  it('keeps the inline subtitle for ERROR steps', () => {
    // Errors need at-a-glance context (the user shouldn't have to expand
    // every failed step to figure out what was being attempted).
    const errored: ReasoningStepOutput = { ...baseStep, status: 'error' }
    render(<ReasoningStepDisplay step={errored} />)
    expect(screen.getByTestId('reasoning-step-description')).toHaveTextContent('Reviewing "Travel Policy.pdf"')
  })

  it('does NOT duplicate the subtitle inside the expanded body when it is shown inline', () => {
    // Regression for the "expand a step → see the same sentence twice"
    // complaint. When the subtitle is already shown inline (running /
    // error), the expanded body must not render its own copy — only the
    // status line + duration.
    const running: ReasoningStepOutput = { ...baseStep, status: 'running' }
    render(<ReasoningStepDisplay step={running} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('reasoning-step-friendly-summary')).not.toBeInTheDocument()
    expect(screen.getByTestId('reasoning-step-friendly-status')).toHaveTextContent('Still working on it')
  })

  it('falls back to the kind label when no user_facing_title is supplied', () => {
    const step: ReasoningStepOutput = {
      type: 'reasoning_step',
      id: 'rs_2',
      kind: 'rag_lookup',
      title: 'some_raw_tool',
      status: 'running'
    }
    render(<ReasoningStepDisplay step={step} />)
    expect(screen.getByText('Picking the right tool for the task')).toBeInTheDocument()
    expect(screen.queryByText('some_raw_tool')).not.toBeInTheDocument()
  })

  it('does NOT reveal Input/Output sections when expanded', () => {
    render(<ReasoningStepDisplay step={baseStep} />)
    fireEvent.click(screen.getByRole('button'))
    const body = screen.getByTestId('reasoning-step-body')
    expect(body).not.toHaveTextContent('Input')
    expect(body).not.toHaveTextContent('Output')
    expect(body).not.toHaveTextContent('something internal')
  })

  it('shows a soft generic message for errored steps and hides the raw error string', () => {
    const errorStep: ReasoningStepOutput = {
      ...baseStep,
      status: 'error',
      error: 'TypeError: cannot read property "x" of undefined'
    }
    render(<ReasoningStepDisplay step={errorStep} />)
    fireEvent.click(screen.getByRole('button'))
    // Soft message lives on the friendly status line — never as a raw
    // error string. Stack traces and LLM internals stay out of the UI.
    expect(screen.getByTestId('reasoning-step-friendly-status')).toHaveTextContent('Something went wrong here')
    expect(screen.queryByText(/TypeError: cannot read property/)).not.toBeInTheDocument()
  })

  it('expanded body is informative (not empty) when there is a friendly summary', () => {
    // Regression test for the "expand → empty box" complaint: friendly
    // mode used to render NOTHING on expand for happy-path steps. The
    // body must now carry the (wrapping) summary plus a soft status
    // line so opening a step always feels like it revealed something.
    render(<ReasoningStepDisplay step={baseStep} />)
    fireEvent.click(screen.getByRole('button'))
    const body = screen.getByTestId('reasoning-step-friendly-body')
    expect(body).toHaveTextContent('Reviewing "Travel Policy.pdf"')
    expect(screen.getByTestId('reasoning-step-friendly-status')).toHaveTextContent('Done')
  })

  it('expanded body shows duration when timestamps are present', () => {
    const step: ReasoningStepOutput = {
      ...baseStep,
      started_at: 1_000,
      ended_at: 1_750
    }
    render(<ReasoningStepDisplay step={step} />)
    fireEvent.click(screen.getByRole('button'))
    // formatReasoningDuration prints e.g. "0.8s" for sub-second values.
    expect(screen.getByTestId('reasoning-step-friendly-duration')).toBeInTheDocument()
  })

  it('renders nothing for a generic "Thinking through the next step" filler', () => {
    // The supervisor's auto-generated thought rows are pure narration
    // fillers — once narration is hidden, they would be empty pills
    // saying "Thinking through the next step" over and over.
    const filler: ReasoningStepOutput = {
      type: 'reasoning_step',
      id: 'rs_filler',
      kind: 'thought',
      title: 'Reasoning',
      status: 'done',
      user_facing_title: 'Thinking through the next step',
      narration: 'I should now look up the team list…'
    }
    const { container } = render(<ReasoningStepDisplay step={filler} />)
    expect(container.firstChild).toBeNull()
  })

  it('still renders a thought step when it carries a meaningful friendly subtitle', () => {
    // E.g. the workflow-creator tool emits kind="thought" rows for each
    // structured action it took (Save workflow, Open node, etc.). Those
    // are semantic and should pass through (vs. the generic "Thinking
    // through the next step" filler we suppress entirely).
    const semantic: ReasoningStepOutput = {
      type: 'reasoning_step',
      id: 'rs_semantic',
      kind: 'thought',
      title: 'Save workflow',
      status: 'done',
      user_facing_title: 'Save workflow',
      user_facing_summary: 'Saved the absence-substitute workflow'
    }
    render(<ReasoningStepDisplay step={semantic} />)
    expect(screen.getByText('Save workflow')).toBeInTheDocument()
    // The summary lives in the expanded body for ``done`` steps so the
    // collapsed trail stays compact; expanding reveals it.
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Saved the absence-substitute workflow')).toBeInTheDocument()
  })

  it('does NOT surface narration anywhere, even inside the expanded body', () => {
    // Narration carries the supervisor's raw "thinking out loud" text,
    // which routinely contains internal tool_call_id references and
    // instructions for other tools. Friendly mode never shows it: the
    // backend-supplied user_facing_title/summary cover everything a
    // regular user should see.
    const leakyNarration =
      'GraphQL query succeeded (Employee=12). tool_call_id="tool_01NQ..." call build_interactive_table(...) before emit_structured_answer'
    const step: ReasoningStepOutput = {
      ...baseStep,
      narration: leakyNarration
    }
    render(<ReasoningStepDisplay step={step} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('reasoning-step-narration')).not.toBeInTheDocument()
    expect(screen.queryByText(/tool_call_id/)).not.toBeInTheDocument()
    expect(screen.queryByText(/build_interactive_table/)).not.toBeInTheDocument()
  })

  it('does NOT show narration as the subtitle even when user_facing_summary is missing', () => {
    const step: ReasoningStepOutput = {
      type: 'reasoning_step',
      id: 'rs_3',
      kind: 'tool_call',
      title: 'run_graphql_query',
      status: 'done',
      user_facing_title: 'Looking up data',
      narration: 'GraphQL query succeeded (Employee=12, 13 rows). tool_call_id="tool_01NQ..."'
      // intentionally no user_facing_summary
    }
    render(<ReasoningStepDisplay step={step} />)
    expect(screen.queryByTestId('reasoning-step-description')).not.toBeInTheDocument()
    expect(screen.queryByText(/tool_call_id/)).not.toBeInTheDocument()
  })
})
