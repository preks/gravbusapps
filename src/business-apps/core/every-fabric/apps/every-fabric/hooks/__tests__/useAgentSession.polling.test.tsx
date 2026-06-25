import { act, renderHook, waitFor } from '@testing-library/react'
import { writeSessionUiCache } from '../agent-session/sessionUiStateCache'
import { POLL_INTERVAL_MS, POLL_INTERVAL_WHILE_SSE_CONNECTED_MS } from '../agent-session/types'
import type { DeepAgentSession } from '../../types/enterpriseAgent'

const mockGetSession = jest.fn()
const mockEnterpriseClient = {
  getSession: (...args: unknown[]) => mockGetSession(...args),
  startSession: jest.fn(),
  activateSession: jest.fn(),
  replyToInterrupt: jest.fn()
}
const mockFlowBotClient = {
  getSession: jest.fn(),
  startSession: jest.fn(),
  activateSession: jest.fn(),
  replyToInterrupt: jest.fn()
}

let mockStreamState = {
  messages: [] as unknown[],
  events: [] as unknown[],
  isConnected: true
}

jest.mock('../useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => mockEnterpriseClient,
  invalidateDeepAgentSessionEtagCache: jest.fn()
}))

jest.mock('../useFlowBotFabricClient', () => ({
  useFlowBotFabricClient: () => mockFlowBotClient
}))

jest.mock('../useSessionStream', () => ({
  useSessionStream: () => mockStreamState
}))

jest.mock('../../utils/fabricRuntime', () => ({
  isFlowBotFabricRuntime: () => false
}))

jest.mock('../sessionStreamRegistry', () => ({
  markSessionStreamRestTerminal: jest.fn(),
  appendSessionStreamEvents: jest.fn()
}))

import { useAgentSession } from '../useAgentSession'
import { appendSessionStreamEvents } from '../sessionStreamRegistry'

const appendMock = appendSessionStreamEvents as jest.Mock

const runningSession: DeepAgentSession = {
  session_id: 'poll-session',
  input: 'hello',
  status: 'running',
  trace: []
}

describe('useAgentSession polling while SSE is live', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue(runningSession)
    mockStreamState = {
      messages: [],
      events: [],
      isConnected: true
    }
    writeSessionUiCache('poll-session', {
      session: runningSession,
      isAgentRunning: true,
      optimisticMessages: [],
      activeSkill: null,
      lastReplyTimestamp: 0,
      processedTerminalAt: -1
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('polls on a slower cadence while SSE is connected and agent is running', async () => {
    renderHook(() => useAgentSession('poll-session', 'token'))

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS + 50)
    })

    expect(mockGetSession).toHaveBeenCalledTimes(2)

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_WHILE_SSE_CONNECTED_MS + 50)
    })

    expect(mockGetSession).toHaveBeenCalledTimes(3)
  })

  it('polls on the slower cadence for landing bootstrap (session running, isAgentRunning false)', async () => {
    writeSessionUiCache('poll-session', {
      session: runningSession,
      isAgentRunning: false,
      optimisticMessages: [],
      activeSkill: null,
      lastReplyTimestamp: 0,
      processedTerminalAt: -1
    })

    renderHook(() => useAgentSession('poll-session', 'token'))

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS + 50)
    })

    expect(mockGetSession).toHaveBeenCalledTimes(2)

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_WHILE_SSE_CONNECTED_MS + 50)
    })

    expect(mockGetSession).toHaveBeenCalledTimes(3)
  })

  it('hydrates once when a terminal stream event arrives', async () => {
    const completedSession: DeepAgentSession = {
      ...runningSession,
      status: 'completed',
      output: 'done'
    }
    mockGetSession.mockResolvedValue(completedSession)

    const { rerender } = renderHook(() => useAgentSession('poll-session', 'token'))

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1))

    mockStreamState = {
      messages: [],
      events: [
        {
          type: 'terminal',
          seq: 42,
          event_id: 'poll-session:42',
          status: 'completed',
          output: 'done',
          timestamp: new Date().toISOString()
        }
      ],
      isConnected: true
    }

    rerender()

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(2))
    expect(mockGetSession).toHaveBeenLastCalledWith('poll-session', { bypassCache: true })
  })
})

describe('useAgentSession registry append filtering during a follow-up', () => {
  // REST snapshot for a follow-up: it still carries the *previous* turn's
  // terminal (seq 23) alongside the current turn (human seq 24 + streaming
  // response seq 39). Feeding the stale terminal into the live registry would
  // mark the stream terminal and abort the current turn's SSE.
  const followupTrace = [
    {
      type: 'agent_chunk',
      role: 'human',
      seq: 1,
      event_id: 'fu:1',
      content: 'hi',
      timestamp: '2026-06-25T13:03:58.000Z'
    },
    {
      type: 'agent_chunk',
      role: 'ai',
      chunk_kind: 'final',
      seq: 2,
      event_id: 'fu:2',
      content: 'hello there',
      timestamp: '2026-06-25T13:03:58.100Z'
    },
    { type: 'terminal', seq: 23, event_id: 'fu:23', status: 'completed', timestamp: '2026-06-25T13:04:03.000Z' },
    {
      type: 'agent_chunk',
      role: 'human',
      seq: 24,
      event_id: 'fu:24',
      content: 'tell me more',
      timestamp: '2026-06-25T13:04:14.800Z'
    },
    {
      type: 'agent_chunk',
      role: 'system',
      chunk_kind: 'status',
      seq: 25,
      event_id: 'fu:25',
      content: 'Working',
      timestamp: '2026-06-25T13:04:15.100Z'
    },
    {
      type: 'agent_chunk',
      role: 'ai',
      chunk_kind: 'response_stream',
      seq: 39,
      event_id: 'fu:39',
      content: 'streaming answer',
      timestamp: '2026-06-25T13:04:23.600Z',
      metadata: { stream_key: 'primary', segment_id: 0 }
    }
  ] as unknown as DeepAgentSession['trace']

  const followupRunningSession: DeepAgentSession = {
    session_id: 'fu-session',
    input: 'hi',
    status: 'running',
    trace: followupTrace
  }

  beforeEach(() => {
    jest.useFakeTimers()
    mockGetSession.mockReset()
    appendMock.mockClear()
    mockGetSession.mockResolvedValue(followupRunningSession)
    mockStreamState = { messages: [], events: [], isConnected: true }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('drops the stale previous-turn terminal from the registry append while a reply is in flight', async () => {
    writeSessionUiCache('fu-session', {
      session: followupRunningSession,
      isAgentRunning: true,
      optimisticMessages: [],
      activeSkill: null,
      lastReplyTimestamp: Date.parse('2026-06-25T13:04:14.000Z'),
      processedTerminalAt: -1
    })

    renderHook(() => useAgentSession('fu-session', 'token'))

    await waitFor(() => expect(appendMock).toHaveBeenCalled())

    const appendedTrace = appendMock.mock.calls[0][1] as Array<{ seq: number; type: string }>
    const seqs = appendedTrace.map(e => e.seq)
    // Current-turn events are present...
    expect(seqs).toEqual(expect.arrayContaining([24, 25, 39]))
    // ...but the prior-turn terminal (and prior-turn rows) are filtered out.
    expect(seqs).not.toContain(23)
    expect(appendedTrace.some(e => e.type === 'terminal')).toBe(false)
  })

  it('appends the full trace (including prior terminal) when no reply is in flight', async () => {
    writeSessionUiCache('fu-session', {
      session: followupRunningSession,
      isAgentRunning: false,
      optimisticMessages: [],
      activeSkill: null,
      lastReplyTimestamp: 0,
      processedTerminalAt: -1
    })

    renderHook(() => useAgentSession('fu-session', 'token'))

    await waitFor(() => expect(appendMock).toHaveBeenCalled())

    const appendedTrace = appendMock.mock.calls[0][1] as Array<{ seq: number }>
    const seqs = appendedTrace.map(e => e.seq)
    expect(seqs).toEqual(expect.arrayContaining([1, 2, 23, 24, 25, 39]))
  })

  it('does not append stale REST trace if the new human turn has not reached REST yet', async () => {
    const staleSnapshot: DeepAgentSession = {
      session_id: 'fu-session',
      input: 'hi',
      status: 'completed',
      trace: followupTrace.slice(0, 3)
    }
    mockGetSession.mockResolvedValue(staleSnapshot)
    writeSessionUiCache('fu-session', {
      session: staleSnapshot,
      isAgentRunning: true,
      optimisticMessages: [],
      activeSkill: null,
      lastReplyTimestamp: Date.parse('2026-06-25T13:04:14.000Z'),
      processedTerminalAt: -1
    })

    renderHook(() => useAgentSession('fu-session', 'token'))

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled())
    expect(appendMock).not.toHaveBeenCalled()
  })
})
