import type { AgentPlanItem, AgentPlanOutput, AgentPlanUpdateOutput, ConversationTurn } from '../types/models'
import { selectLatestAgentPlan, selectLatestPlanFromOutputs } from './agentPlanUtils'

const items = (...statuses: AgentPlanItem['status'][]): AgentPlanItem[] =>
  statuses.map((status, idx) => ({ id: `i${idx}`, content: `step ${idx}`, status }))

const planSnapshot = (id: string, ...statuses: AgentPlanItem['status'][]): AgentPlanOutput => ({
  type: 'agent_plan',
  id,
  items: items(...statuses)
})

const planUpdate = (id: string, ...statuses: AgentPlanItem['status'][]): AgentPlanUpdateOutput => ({
  type: 'agent_plan_update',
  id,
  items: items(...statuses)
})

describe('selectLatestPlanFromOutputs', () => {
  it('returns null when no outputs are provided', () => {
    expect(selectLatestPlanFromOutputs([])).toBeNull()
    expect(selectLatestPlanFromOutputs(undefined)).toBeNull()
    expect(selectLatestPlanFromOutputs(null)).toBeNull()
  })

  it('returns null when outputs contain no plan events', () => {
    expect(selectLatestPlanFromOutputs([{ type: 'loading' }, { type: 'tool', name: 'noop' } as any])).toBeNull()
  })

  it('returns the only plan event when one is present', () => {
    const result = selectLatestPlanFromOutputs([planSnapshot('plan-1', 'pending', 'pending')])
    expect(result).toEqual({ planId: 'plan-1', items: items('pending', 'pending') })
  })

  it('returns the latest plan event when multiple snapshots are present', () => {
    const result = selectLatestPlanFromOutputs([
      planSnapshot('plan-1', 'pending', 'pending'),
      planUpdate('plan-1', 'in_progress', 'pending'),
      planUpdate('plan-1', 'completed', 'in_progress')
    ])
    expect(result).toEqual({
      planId: 'plan-1',
      items: items('completed', 'in_progress')
    })
  })

  it('treats a later plan with a different id as the new authoritative plan', () => {
    const result = selectLatestPlanFromOutputs([
      planSnapshot('plan-1', 'completed', 'completed'),
      planSnapshot('plan-2', 'pending')
    ])
    expect(result).toEqual({ planId: 'plan-2', items: items('pending') })
  })
})

describe('selectLatestAgentPlan', () => {
  it('returns null for empty conversations', () => {
    expect(selectLatestAgentPlan([])).toBeNull()
    expect(selectLatestAgentPlan(undefined)).toBeNull()
    expect(selectLatestAgentPlan(null)).toBeNull()
  })

  it('returns null when no agent turn carries a plan', () => {
    const turns: ConversationTurn[] = [
      { side: 'user', text: 'hi' },
      { side: 'agent', outputs: [{ type: 'loading' }] }
    ]
    expect(selectLatestAgentPlan(turns)).toBeNull()
  })

  it('returns the plan from the most recent agent turn that has one', () => {
    const turns: ConversationTurn[] = [
      { side: 'user', text: 'plan it' },
      {
        side: 'agent',
        outputs: [planSnapshot('plan-old', 'completed')]
      },
      { side: 'user', text: 'next step' },
      {
        side: 'agent',
        outputs: [planSnapshot('plan-new', 'pending'), planUpdate('plan-new', 'in_progress')]
      }
    ]

    expect(selectLatestAgentPlan(turns)).toEqual({
      planId: 'plan-new',
      items: items('in_progress')
    })
  })

  it('falls back to an earlier turn when the latest agent turn has no plan', () => {
    const turns: ConversationTurn[] = [
      {
        side: 'agent',
        outputs: [planSnapshot('plan-1', 'in_progress', 'pending')]
      },
      { side: 'user', text: 'follow up' },
      { side: 'agent', outputs: [{ type: 'loading' }] }
    ]

    expect(selectLatestAgentPlan(turns)).toEqual({
      planId: 'plan-1',
      items: items('in_progress', 'pending')
    })
  })
})
