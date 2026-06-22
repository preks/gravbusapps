/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../../workforceTypes'
import { RunDetailBody } from '../RunDetailBody'

const replyToInterrupt = jest.fn(async () => ({}))

jest.mock('../../../../hooks/useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => ({ replyToInterrupt })
}))

jest.mock('../../../chat/EmailComposerBubble', () => ({
  EmailComposerBubble: ({
    draft,
    onSubmit
  }: {
    draft: { subject?: string }
    onSubmit: (submission: Record<string, unknown>) => void
  }) => (
    <div data-testid="email-composer-mock">
      <span data-testid="email-composer-subject">{draft.subject}</span>
      <button
        type="button"
        data-testid="email-composer-send"
        onClick={() => onSubmit({ form_id: 'compose_email', action: 'send', subject: draft.subject })}
      >
        Send
      </button>
    </div>
  )
}))

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-abc123',
    agent_id: 'agent-1',
    status: 'completed',
    input: 'Triage policy questions',
    output: 'Sent reply to customer.',
    cost_summary: { total_tokens: 2500 },
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:00:10Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:10Z',
    ...overrides
  }
}

const TRACE: WorkforceRunTraceEvent[] = [
  { seq: 1, event_id: 'e1', type: 'workforce_run_started', timestamp: '2026-01-01T00:00:00Z' },
  {
    seq: 2,
    event_id: 'e2',
    type: 'tool_call',
    timestamp: '2026-01-01T00:00:05Z',
    message: 'Called lookup_policy(id="P-42")'
  }
]

// accessToken is "" so the audit timeline (which fetches) is skipped.
function renderBody(run: WorkforceRun, trace: WorkforceRunTraceEvent[] = TRACE) {
  return render(<RunDetailBody run={run} accessToken="" trace={trace} />)
}

function buildComposeEmailRun(): WorkforceRun {
  return buildRun({
    status: 'waiting_for_human',
    pending_human_question: 'Review and send email',
    pending_structured_input: {
      form_id: 'compose_email',
      description: 'Review the drafted email',
      email_draft: {
        to: [{ address: 'jonas.weber@example.com', name: 'Jonas Weber' }],
        subject: 'Re: Need to report a car accident',
        text_body: 'Dear Jonas,\n\nThank you for contacting us.'
      }
    }
  })
}

describe('RunDetailBody', () => {
  beforeEach(() => {
    replyToInterrupt.mockClear()
  })

  it('renders the interactive email composer for a compose_email approval', () => {
    render(<RunDetailBody run={buildComposeEmailRun()} accessToken="test-token" trace={TRACE} />)
    expect(screen.getByTestId('workforce-run-detail-email-composer')).toBeInTheDocument()
    expect(screen.getByTestId('email-composer-subject')).toHaveTextContent('Re: Need to report a car accident')
  })

  it('submits a compose_email approval via replyToInterrupt and refreshes the run', async () => {
    const onRefreshRun = jest.fn(async () => {})
    render(
      <RunDetailBody run={buildComposeEmailRun()} accessToken="test-token" trace={TRACE} onRefreshRun={onRefreshRun} />
    )
    fireEvent.click(screen.getByTestId('email-composer-send'))
    await waitFor(() => {
      expect(replyToInterrupt).toHaveBeenCalledWith(
        'sess-abc123',
        undefined,
        expect.objectContaining({ form_id: 'compose_email', action: 'send' })
      )
    })
    await waitFor(() => expect(onRefreshRun).toHaveBeenCalled())
  })

  it('prompts for sign-in when a compose_email draft is pending without a token', () => {
    render(<RunDetailBody run={buildComposeEmailRun()} accessToken="" trace={TRACE} />)
    expect(screen.queryByTestId('workforce-run-detail-email-composer')).toBeNull()
    expect(screen.getByTestId('run-detail-approval')).toHaveTextContent('run-overview-signin-required')
  })

  it('renders task and output on the Overview tab', () => {
    renderBody(buildRun())
    expect(screen.getByTestId('run-detail-task')).toHaveTextContent('Triage policy questions')
    expect(screen.getByTestId('run-detail-output')).toHaveTextContent('Sent reply to customer.')
  })

  it('renders credits and a readable trace on the Diagnostics tab', () => {
    renderBody(buildRun())
    fireEvent.click(screen.getByTestId('run-detail-tab-diagnostics'))
    expect(screen.getByText('run-diag-credits')).toBeInTheDocument()
    expect(screen.getByTestId('run-detail-trace')).toHaveTextContent('Run started')
    expect(screen.getByTestId('run-detail-trace')).toHaveTextContent('Called lookup_policy(id="P-42")')
  })

  it('shows the draft awaiting human approval', () => {
    renderBody(
      buildRun({
        status: 'waiting_for_human',
        pending_human_question: 'Approve this reply?',
        pending_structured_input: {
          subject: 'Re: Claim status for policy NW-2024-88421',
          body: 'Dear Maria,\n\nYour claim is **under review**.'
        }
      })
    )
    const approval = screen.getByTestId('run-detail-approval')
    expect(approval).toHaveTextContent('Approve this reply?')
    expect(approval).toHaveTextContent('Re: Claim status for policy NW-2024-88421')
    expect(approval).toHaveTextContent('Your claim is **under review**.')
  })

  it('lists artifacts with size labels', () => {
    renderBody(
      buildRun({
        artifacts: [
          { name: 'draft-reply.md', path: 'drafts/draft-reply.md', mime_type: 'text/markdown', size: 2048 },
          { name: 'attachment.pdf', path: null, mime_type: 'application/pdf', size: 1_500_000 }
        ]
      })
    )
    const artifacts = screen.getByTestId('run-detail-artifacts')
    expect(artifacts).toHaveTextContent('draft-reply.md')
    expect(artifacts).toHaveTextContent('drafts/draft-reply.md')
    expect(artifacts).toHaveTextContent('2.0 KB')
    expect(artifacts).toHaveTextContent('attachment.pdf')
    expect(artifacts).toHaveTextContent('1.4 MB')
  })

  it('renders Output through the markdown renderer', () => {
    renderBody(buildRun({ output: '### Summary\n\n- bullet one' }))
    const output = screen.getByTestId('run-detail-output')
    expect(output.querySelector('[data-testid="react-markdown-mock"]')).not.toBeNull()
    expect(output).toHaveTextContent('### Summary')
  })
})
