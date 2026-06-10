// Data hook for the Workforce Agent configuration view.
//
// Owns the live agent record and its triggers, exposes section-scoped
// save callbacks (each section saves a tightly scoped update so the
// blast radius is obvious to the user), and delegates trigger CRUD to
// the prompt-manager client. The view never edits ODM fields directly:
// it always goes through one of the callbacks here.

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  normalizeWorkforceAgent,
  type WorkforceAgent,
  type WorkforceAgentUpdateInput,
  type WorkforceTrigger,
  type WorkforceTriggerCreateInput,
  type WorkforceTriggerUpdateInput
} from './workforceTypes'

export interface WorkforceAgentConfigState {
  agent: WorkforceAgent | null
  triggers: WorkforceTrigger[]
  isLoading: boolean
  error: string | null
  savingSection: string | null
  pendingTriggerId: string | null
  refetch: () => Promise<void>
  saveSection: (section: string, patch: WorkforceAgentUpdateInput) => Promise<void>
  createTrigger: (input: WorkforceTriggerCreateInput) => Promise<void>
  updateTrigger: (triggerId: string, input: WorkforceTriggerUpdateInput) => Promise<void>
  deleteTrigger: (triggerId: string) => Promise<void>
  clearError: () => void
}

interface UseWorkforceAgentConfigOptions {
  accessToken: string
  agentId: string | null
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function useWorkforceAgentConfig({
  accessToken,
  agentId
}: UseWorkforceAgentConfigOptions): WorkforceAgentConfigState {
  const client = usePromptManagerClient(accessToken)

  const [agent, setAgent] = useState<WorkforceAgent | null>(null)
  const [triggers, setTriggers] = useState<WorkforceTrigger[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [pendingTriggerId, setPendingTriggerId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!agentId) {
      setAgent(null)
      setTriggers([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [agentResp, triggerResp] = await Promise.all([
        client.getWorkforceAgent(agentId),
        client.listWorkforceTriggers(agentId).catch(() => [] as WorkforceTrigger[])
      ])
      setAgent(normalizeWorkforceAgent(agentResp))
      setTriggers(triggerResp)
    } catch (err) {
      setError(describeError(err, 'Failed to load workforce agent.'))
    } finally {
      setIsLoading(false)
    }
  }, [client, agentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const saveSection = useCallback(
    async (section: string, patch: WorkforceAgentUpdateInput) => {
      if (!agentId) return
      setSavingSection(section)
      setError(null)
      try {
        const updated = await client.updateWorkforceAgent(agentId, patch)
        setAgent(normalizeWorkforceAgent(updated))
      } catch (err) {
        setError(describeError(err, `Failed to save ${section}.`))
        throw err
      } finally {
        setSavingSection(null)
      }
    },
    [client, agentId]
  )

  const createTrigger = useCallback(
    async (input: WorkforceTriggerCreateInput) => {
      if (!agentId) return
      setPendingTriggerId('__create__')
      setError(null)
      try {
        const created = await client.createWorkforceTrigger(agentId, input)
        setTriggers(prev => [created, ...prev])
      } catch (err) {
        setError(describeError(err, 'Failed to create trigger.'))
        throw err
      } finally {
        setPendingTriggerId(null)
      }
    },
    [client, agentId]
  )

  const updateTrigger = useCallback(
    async (triggerId: string, input: WorkforceTriggerUpdateInput) => {
      setPendingTriggerId(triggerId)
      setError(null)
      try {
        const updated = await client.updateWorkforceTrigger(triggerId, input)
        setTriggers(prev => prev.map(t => (t.trigger_id === triggerId ? updated : t)))
      } catch (err) {
        setError(describeError(err, 'Failed to update trigger.'))
        throw err
      } finally {
        setPendingTriggerId(null)
      }
    },
    [client]
  )

  const deleteTrigger = useCallback(
    async (triggerId: string) => {
      setPendingTriggerId(triggerId)
      setError(null)
      try {
        await client.deleteWorkforceTrigger(triggerId)
        setTriggers(prev => prev.filter(t => t.trigger_id !== triggerId))
      } catch (err) {
        setError(describeError(err, 'Failed to delete trigger.'))
        throw err
      } finally {
        setPendingTriggerId(null)
      }
    },
    [client]
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    agent,
    triggers,
    isLoading,
    error,
    savingSection,
    pendingTriggerId,
    refetch,
    saveSection,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    clearError
  }
}
