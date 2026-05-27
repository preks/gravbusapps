import type { DeepAgentSession } from '../../types/enterpriseAgent'

export const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

/** Exported for tests — matches deployed streaming UX semantics. */
export const deriveFabricIsStreaming = (
  isAgentRunning: boolean,
  sessionStatus: DeepAgentSession['status'] | undefined
): boolean => isAgentRunning || sessionStatus === 'pending' || sessionStatus === 'running'

export const isTerminalSessionStatus = (status: DeepAgentSession['status'] | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'

export const isRestTerminalStatus = (status: DeepAgentSession['status']): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled'
