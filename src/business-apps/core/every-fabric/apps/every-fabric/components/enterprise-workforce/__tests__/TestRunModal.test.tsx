/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { TestRunModal } from '../TestRunModal'
import type { WorkforceAgent, WorkforceRun, WorkforceRunCreateInput, WorkforceTrigger } from '../workforceTypes'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'agent-1',
    name: 'helper',
    display_name: 'Helper',
    description: '',
    domain: 'support',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Specialist',
      department: 'Ops',
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.6,
        blocked_intents: []
      },
      budget: {
        daily_credit_limit: null,
        weekly_credit_limit: null,
        monthly_credit_limit: null,
        on_exceeded: 'pause'
      },
      knowledge_refs: [],
      instructions: ''
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function buildTrigger(overrides: Partial<WorkforceTrigger> = {}): WorkforceTrigger {
  return {
    trigger_id: 't-1',
    agent_id: 'agent-1',
    workspace_id: null,
    type: 'schedule',
    name: 'Hourly',
    enabled: true,
    config: { interval_minutes: 60 },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function makeRun(): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    workforce_trigger_id: null,
    status: 'running',
    input: 'go',
    output: null,
    cost_summary: null,
    pending_human_question: null,
    workspace_id: 'ws',
    user_id: 'alice',
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
}

describe('TestRunModal', () => {
  it('does not render when closed', () => {
    render(
      <TestRunModal
        open={false}
        agent={buildAgent()}
        triggers={[]}
        isStarting={false}
        onClose={() => {}}
        onSubmit={async () => makeRun()}
      />
    )
    expect(screen.queryByTestId('workforce-test-run-modal')).toBeNull()
  })

  it('disables submit when the task is empty and enables once typed', async () => {
    const onSubmit = jest.fn(async () => makeRun())
    render(
      <TestRunModal open agent={buildAgent()} triggers={[]} isStarting={false} onClose={() => {}} onSubmit={onSubmit} />
    )
    const submit = screen.getByTestId('workforce-test-run-submit')
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByTestId('workforce-test-run-task'), {
      target: { value: 'Look up policy P-42.' }
    })
    expect(submit).not.toBeDisabled()
  })

  it('submits with the typed task and closes on success', async () => {
    const onSubmit = jest.fn(async () => makeRun())
    const onClose = jest.fn()
    render(
      <TestRunModal open agent={buildAgent()} triggers={[]} isStarting={false} onClose={onClose} onSubmit={onSubmit} />
    )

    fireEvent.change(screen.getByTestId('workforce-test-run-task'), {
      target: { value: '  Look up policy P-42.  ' }
    })
    fireEvent.click(screen.getByTestId('workforce-test-run-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        input: 'Look up policy P-42.',
        trigger_id: null
      } satisfies WorkforceRunCreateInput)
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps the modal open on submit failure so the operator can retry', async () => {
    const onClose = jest.fn()
    const onSubmit = jest.fn(async () => {
      throw new Error('nope')
    })
    render(
      <TestRunModal open agent={buildAgent()} triggers={[]} isStarting={false} onClose={onClose} onSubmit={onSubmit} />
    )

    fireEvent.change(screen.getByTestId('workforce-test-run-task'), {
      target: { value: 'go' }
    })
    fireEvent.click(screen.getByTestId('workforce-test-run-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('passes the selected trigger_id when attribution is chosen', async () => {
    const trigger = buildTrigger()
    const onSubmit = jest.fn(async () => makeRun())
    render(
      <TestRunModal
        open
        agent={buildAgent()}
        triggers={[trigger]}
        isStarting={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByTestId('workforce-test-run-task'), {
      target: { value: 'go' }
    })
    fireEvent.change(screen.getByTestId('workforce-test-run-trigger'), {
      target: { value: trigger.trigger_id }
    })
    fireEvent.click(screen.getByTestId('workforce-test-run-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        input: 'go',
        trigger_id: trigger.trigger_id
      })
    })
  })

  it('renders the error banner when provided', () => {
    render(
      <TestRunModal
        open
        agent={buildAgent()}
        triggers={[]}
        isStarting={false}
        errorMessage="server said no"
        onClose={() => {}}
        onSubmit={async () => makeRun()}
      />
    )
    expect(screen.getByTestId('workforce-test-run-error')).toHaveTextContent('server said no')
  })

  it('pre-fills the task when a demo inbound email is selected', () => {
    render(
      <TestRunModal
        open
        agent={buildAgent()}
        triggers={[]}
        isStarting={false}
        onClose={() => {}}
        onSubmit={async () => makeRun()}
      />
    )

    fireEvent.change(screen.getByTestId('workforce-test-run-demo-email'), {
      target: { value: 'status_update' }
    })

    const task = screen.getByTestId('workforce-test-run-task') as HTMLTextAreaElement
    expect(task.value).toContain('Subject: Claim status for policy NW-2024-88421')
    expect(task.value).toContain('From: maria.schmidt@example.com')
    expect(task.value).toContain('To: claims@insurance-demo.local')
    expect(task.value).toContain('Maria Schmidt')
    expect(screen.getByTestId('workforce-test-run-demo-email-hint')).toHaveTextContent('testrun-expected')
    expect(screen.getByTestId('workforce-test-run-submit')).not.toBeDisabled()
  })

  it('submits the pre-filled demo email task unchanged', async () => {
    const onSubmit = jest.fn(async () => makeRun())
    render(
      <TestRunModal open agent={buildAgent()} triggers={[]} isStarting={false} onClose={() => {}} onSubmit={onSubmit} />
    )

    fireEvent.change(screen.getByTestId('workforce-test-run-demo-email'), {
      target: { value: 'complaint' }
    })
    fireEvent.click(screen.getByTestId('workforce-test-run-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.stringContaining('Subject: Formal complaint — unacceptable delays'),
          trigger_id: null
        })
      )
    })
  })
})
