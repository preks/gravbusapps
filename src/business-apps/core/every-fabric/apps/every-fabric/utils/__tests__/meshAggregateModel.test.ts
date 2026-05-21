import type { DeepAgentSession } from '../../types/enterpriseAgent'
import { buildAggregateModel, buildAggregateStats } from '../meshAggregateModel'

const ts = (offsetSeconds: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, offsetSeconds, 0)).toISOString()

function makeSession(overrides: Partial<DeepAgentSession> & { session_id: string; user_id: string }): DeepAgentSession {
  return {
    input: 'Test task',
    status: 'completed',
    created_at: ts(0),
    trace: [],
    ...overrides
  } as DeepAgentSession
}

describe('meshAggregateModel', () => {
  describe('buildAggregateModel', () => {
    it('returns an empty model when no sessions are provided', () => {
      const model = buildAggregateModel([])
      expect(model.nodes).toHaveLength(0)
      expect(model.edges).toHaveLength(0)
      expect(model.totalSessions).toBe(0)
      expect(model.totalUsers).toBe(0)
    })

    it('deduplicates experts across multiple sessions', () => {
      const session1 = makeSession({
        session_id: 'sess-1',
        user_id: 'user-a',
        trace: [
          {
            type: 'expert_called',
            seq: 1,
            event_id: 'e1',
            step_id: 's1',
            name: 'VideoExpert',
            expert_name: 'VideoExpert',
            task_summary: 'Create video',
            timestamp: ts(0)
          },
          {
            type: 'expert_completed',
            seq: 2,
            event_id: 'e2',
            step_id: 's1',
            name: 'VideoExpert',
            status: 'done',
            duration_ms: 500,
            timestamp: ts(1)
          }
        ]
      })

      const session2 = makeSession({
        session_id: 'sess-2',
        user_id: 'user-b',
        trace: [
          {
            type: 'expert_called',
            seq: 1,
            event_id: 'e3',
            step_id: 's2',
            name: 'VideoExpert',
            expert_name: 'VideoExpert',
            task_summary: 'Edit video',
            timestamp: ts(10)
          },
          {
            type: 'expert_completed',
            seq: 2,
            event_id: 'e4',
            step_id: 's2',
            name: 'VideoExpert',
            status: 'done',
            duration_ms: 300,
            timestamp: ts(11)
          }
        ]
      })

      const model = buildAggregateModel([session1, session2])

      const experts = model.nodes.filter(n => n.kind === 'expert')
      expect(experts).toHaveLength(1)
      expect(experts[0].label).toBe('VideoExpert')
      expect(experts[0].invocationCount).toBeGreaterThanOrEqual(2)
      expect(experts[0].sessionCount).toBe(2)
      expect(experts[0].users).toHaveLength(2)
      expect(model.totalSessions).toBe(2)
      expect(model.totalUsers).toBe(2)
    })

    it('deduplicates tools across sessions', () => {
      const session1 = makeSession({
        session_id: 'sess-1',
        user_id: 'user-a',
        trace: [
          {
            type: 'step_started',
            seq: 1,
            event_id: 'e1',
            step_id: 's1',
            name: 'search',
            step_type: 'tool',
            timestamp: ts(0)
          },
          {
            type: 'step_completed',
            seq: 2,
            event_id: 'e2',
            step_id: 's1',
            name: 'search',
            output: 'result',
            status: 'done',
            duration_ms: 200,
            timestamp: ts(1)
          }
        ]
      })

      const session2 = makeSession({
        session_id: 'sess-2',
        user_id: 'user-a',
        trace: [
          {
            type: 'step_started',
            seq: 1,
            event_id: 'e3',
            step_id: 's2',
            name: 'search',
            step_type: 'tool',
            timestamp: ts(5)
          },
          {
            type: 'step_completed',
            seq: 2,
            event_id: 'e4',
            step_id: 's2',
            name: 'search',
            output: 'result2',
            status: 'done',
            duration_ms: 100,
            timestamp: ts(6)
          }
        ]
      })

      const model = buildAggregateModel([session1, session2])

      const tools = model.nodes.filter(n => n.kind === 'tool')
      expect(tools).toHaveLength(1)
      expect(tools[0].invocationCount).toBeGreaterThanOrEqual(2)
      expect(tools[0].sessionCount).toBe(2)
      expect(model.totalUsers).toBe(1)
    })

    it('tracks user provenance correctly', () => {
      const session1 = makeSession({
        session_id: 'sess-1',
        user_id: 'user-alpha',
        trace: [
          {
            type: 'subagent_spawned',
            seq: 1,
            event_id: 'e1',
            step_id: 's1',
            name: 'AnalysisAgent',
            agent_name: 'AnalysisAgent',
            task_summary: 'Analyze data',
            timestamp: ts(0)
          }
        ]
      })

      const session2 = makeSession({
        session_id: 'sess-2',
        user_id: 'user-beta',
        trace: [
          {
            type: 'subagent_spawned',
            seq: 1,
            event_id: 'e2',
            step_id: 's2',
            name: 'AnalysisAgent',
            agent_name: 'AnalysisAgent',
            task_summary: 'Analyze more data',
            timestamp: ts(5)
          }
        ]
      })

      const model = buildAggregateModel([session1, session2])

      const agent = model.nodes.find(n => n.label === 'AnalysisAgent')
      expect(agent).toBeDefined()
      expect(agent!.users).toHaveLength(2)
      expect(agent!.users.some(u => u.userId === 'user-alpha')).toBe(true)
      expect(agent!.users.some(u => u.userId === 'user-beta')).toBe(true)
      expect(agent!.sessions).toHaveLength(2)
    })

    it('collapses edges by source+target+kind', () => {
      const session1 = makeSession({
        session_id: 'sess-1',
        user_id: 'user-a',
        trace: [
          {
            type: 'expert_called',
            seq: 1,
            event_id: 'e1',
            step_id: 's1',
            name: 'CRM',
            expert_name: 'CRM',
            task_summary: 'Task A',
            timestamp: ts(0)
          },
          {
            type: 'expert_completed',
            seq: 2,
            event_id: 'e2',
            step_id: 's1',
            name: 'CRM',
            status: 'done',
            duration_ms: 100,
            timestamp: ts(1)
          }
        ]
      })

      const session2 = makeSession({
        session_id: 'sess-2',
        user_id: 'user-b',
        trace: [
          {
            type: 'expert_called',
            seq: 1,
            event_id: 'e3',
            step_id: 's2',
            name: 'CRM',
            expert_name: 'CRM',
            task_summary: 'Task B',
            timestamp: ts(5)
          },
          {
            type: 'expert_completed',
            seq: 2,
            event_id: 'e4',
            step_id: 's2',
            name: 'CRM',
            status: 'done',
            duration_ms: 200,
            timestamp: ts(6)
          }
        ]
      })

      const model = buildAggregateModel([session1, session2])

      const expertCallEdges = model.edges.filter(e => e.kind === 'expert_call')
      expect(expertCallEdges).toHaveLength(1)
      expect(expertCallEdges[0].invocationCount).toBe(2)
      expect(expertCallEdges[0].sessionCount).toBe(2)
      expect(expertCallEdges[0].sampleSessionIds).toContain('sess-1')
      expect(expertCallEdges[0].sampleSessionIds).toContain('sess-2')
    })
  })

  describe('buildAggregateStats', () => {
    it('produces correct stats from aggregate model', () => {
      const session = makeSession({
        session_id: 'sess-1',
        user_id: 'user-a',
        trace: [
          {
            type: 'expert_called',
            seq: 1,
            event_id: 'e1',
            step_id: 's1',
            name: 'VideoExpert',
            expert_name: 'VideoExpert',
            task_summary: 'Make video',
            timestamp: ts(0)
          },
          {
            type: 'skill_loaded',
            seq: 2,
            event_id: 'e2',
            skill: { skill_id: 'sk-1', name: 'HyperframesSkill' },
            timestamp: ts(1)
          },
          {
            type: 'step_started',
            seq: 3,
            event_id: 'e3',
            step_id: 's3',
            name: 'render_video',
            step_type: 'tool',
            timestamp: ts(2)
          },
          {
            type: 'step_completed',
            seq: 4,
            event_id: 'e4',
            step_id: 's3',
            name: 'render_video',
            output: 'done',
            status: 'done',
            duration_ms: 100,
            timestamp: ts(3)
          }
        ]
      })

      const model = buildAggregateModel([session])
      const stats = buildAggregateStats(model)

      expect(stats.agentCount).toBeGreaterThanOrEqual(1)
      expect(stats.skillCount).toBe(1)
      expect(stats.toolCount).toBe(1)
      expect(stats.sessionCount).toBe(1)
      expect(stats.userCount).toBe(1)
      expect(stats.topAgents.length).toBeGreaterThan(0)
      expect(stats.topSkills.length).toBe(1)
      expect(stats.topTools.length).toBe(1)
    })
  })
})
