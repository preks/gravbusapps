import type { ActiveSessionSnapshot } from '../../../types/activeSession'
import { ORCHESTRATOR_NODE_ID } from '../../../utils/traceModel'
import type { AggregateTraceModel } from '../../../utils/meshAggregateModel'
import { buildLiveMeshActivity, buildModelLiveActivity } from '../liveMeshActivity'

function session(overrides: Partial<ActiveSessionSnapshot>): ActiveSessionSnapshot {
  return {
    session_id: 'session-1',
    input: 'Find employees',
    status: 'running',
    skill: null,
    current_activity: { step: 'thinking', label: 'Thinking' },
    todos_summary: { done: 0, total: 1 },
    trace_count: 1,
    next_event_seq: 2,
    ...overrides
  }
}

describe('buildLiveMeshActivity', () => {
  it('marks active tool calls and the orchestrator as hot', () => {
    const activity = buildLiveMeshActivity(
      [
        session({
          current_activity: { step: 'tool_call', label: 'Searching', tool_name: 'newwork_search' }
        })
      ],
      1000
    )

    expect(activity.summary.liveSessions).toBe(1)
    expect(activity.summary.activeTools).toBe(1)
    expect(activity.nodeActivityById.get(ORCHESTRATOR_NODE_ID)?.liveCount).toBe(1)
    expect(activity.nodeActivityById.get('tool::newwork_search')?.liveCount).toBe(1)
    expect(activity.edgeActivityById.get(`${ORCHESTRATOR_NODE_ID}::tool::newwork_search::tool_call`)?.liveCount).toBe(1)
  })

  it('stacks concurrent sessions on the same node', () => {
    const activity = buildLiveMeshActivity(
      [
        session({
          session_id: 'session-1',
          current_activity: { step: 'expert', label: 'CRM lookup', expert_name: 'CRMExpert' }
        }),
        session({
          session_id: 'session-2',
          current_activity: { step: 'expert', label: 'CRM lookup', expert_name: 'CRMExpert' }
        })
      ],
      1000
    )

    expect(activity.summary.liveSessions).toBe(2)
    expect(activity.summary.activeAgents).toBe(1)
    expect(activity.nodeActivityById.get('expert::crmexpert')?.liveCount).toBe(2)
  })

  it('maps active skills and waiting-for-human sessions', () => {
    const activity = buildLiveMeshActivity(
      [
        session({
          status: 'waiting_for_human',
          skill: { id: 'skill-1', name: 'Policy Load' },
          current_activity: { step: 'awaiting_human', label: 'Waiting for approval' }
        })
      ],
      1000
    )

    expect(activity.summary.waitingForHuman).toBe(1)
    expect(activity.summary.activeSkills).toBe(1)
    expect(activity.nodeActivityById.get('skill::policy load')?.liveCount).toBe(1)
  })

  it('ignores stale active-session snapshots so old stuck sessions do not light the mesh', () => {
    const activity = buildLiveMeshActivity(
      [
        session({
          updated_at: '2024-01-01T00:00:00.000Z',
          current_activity: { step: 'tool_call', label: 'Old lookup', tool_name: 'newwork_search' }
        })
      ],
      Date.parse('2024-01-01T00:03:01.000Z')
    )

    expect(activity.summary.liveSessions).toBe(0)
    expect(activity.nodeActivityById.size).toBe(0)
    expect(activity.edgeActivityById.size).toBe(0)
  })

  it('falls back to aggregate model running status when active-session feed is empty', () => {
    const model = {
      nodes: [
        {
          id: ORCHESTRATOR_NODE_ID,
          kind: 'orchestrator',
          label: 'Every',
          status: 'running',
          sessions: [
            { sessionId: 's1', status: 'running', title: 'Task', userId: 'u1', createdAt: '', invocationCount: 1 }
          ]
        },
        {
          id: 'tool::ask_human_structured',
          kind: 'tool',
          label: 'ask_human_structured',
          status: 'running',
          sessions: [
            { sessionId: 's1', status: 'running', title: 'Task', userId: 'u1', createdAt: '', invocationCount: 1 }
          ]
        }
      ],
      edges: [
        {
          id: `${ORCHESTRATOR_NODE_ID}::tool::ask_human_structured::tool_call`,
          source: ORCHESTRATOR_NODE_ID,
          target: 'tool::ask_human_structured',
          kind: 'tool_call',
          seq: 1,
          timestamp: '',
          offsetMs: 0,
          label: 'ask_human_structured'
        }
      ]
    } as AggregateTraceModel

    const activity = buildModelLiveActivity(model, 1000)

    expect(activity.summary.liveSessions).toBe(1)
    expect(activity.summary.activeTools).toBe(1)
    expect(activity.nodeActivityById.get('tool::ask_human_structured')?.liveCount).toBe(1)
    expect(
      activity.edgeActivityById.get(`${ORCHESTRATOR_NODE_ID}::tool::ask_human_structured::tool_call`)?.liveCount
    ).toBe(1)
  })
})
