import { renderHook } from '@testing-library/react'

const mockAcquire = jest.fn(() => ({ release: jest.fn() }))
const mockEnsure = jest.fn()
const mockSubscribe = jest.fn(() => () => {})
const mockGetState = jest.fn(() => null)

jest.mock('../sessionStreamRegistry', () => ({
  acquireSessionStream: (...args: unknown[]) => mockAcquire(...args),
  ensureSessionStreamEntry: (...args: unknown[]) => mockEnsure(...args),
  subscribeSessionStream: (...args: unknown[]) => mockSubscribe(...args),
  getSessionStreamState: (...args: unknown[]) => mockGetState(...args)
}))

jest.mock('../../utils/fabricRuntime', () => ({
  isFlowBotFabricRuntime: () => false
}))

import { useSessionStreamEntry } from '../useSessionStreamEntry'

describe('useSessionStreamEntry terminal suppression', () => {
  beforeEach(() => {
    mockAcquire.mockClear()
    mockEnsure.mockClear()
    mockSubscribe.mockClear()
    mockGetState.mockClear()
  })

  it('does not acquire a live stream when streamSuppressed is true', () => {
    renderHook(() => useSessionStreamEntry('completed-session', 'token', true))
    expect(mockAcquire).not.toHaveBeenCalled()
    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  it('acquires a live stream when streamSuppressed is false', () => {
    renderHook(() => useSessionStreamEntry('active-session', 'token', false))
    expect(mockAcquire).toHaveBeenCalledWith('active-session', 'token')
  })
})
