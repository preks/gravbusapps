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
