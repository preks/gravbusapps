// Shared per-agent intranet policy state.
//
// Encapsulates the load/persist logic for an agent's policy allow-list so
// both the Enterprise Agent Studio (AgentConfigView) and the Workforce
// agent config screen can present the identical "real policies" UX:
// workspace defaults are inherited automatically, per-agent policies extend
// them, and defaults can be excluded for a specific agent. Persistence goes
// through the UUID-validated registry endpoint (PUT /agents/registry/{id}/policies).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { isPolicyUuid, type PickedPolicy } from './AddPoliciesModal'

interface AttachedPolicy {
  policy_id: string
  title: string
}

export interface EffectivePolicy {
  policy_id: string
  title: string
  isDefault: boolean
}

export interface UseAgentPoliciesResult {
  /** False when the agent's ODM does not store per-agent policy refs. */
  supported: boolean
  isLoading: boolean
  error: string | null
  /** Workspace defaults (minus exclusions) + explicit agent policies. */
  effectivePolicies: EffectivePolicy[]
  /** Explicit (non-default) policy ids — used for the picker's pre-check. */
  attachedPolicyIds: string[]
  workspaceDefaultIds: Set<string>
  excludedPolicyIds: Set<string>
  applyPicked: (picked: PickedPolicy[]) => void
  removePolicy: (policyId: string, isDefault?: boolean) => void
}

export function useAgentPolicies(agentId: string, accessToken: string): UseAgentPoliciesResult {
  const client = usePromptManagerClient(accessToken)
  const [policies, setPolicies] = useState<AttachedPolicy[]>([])
  const [excludedPolicyIds, setExcludedPolicyIds] = useState<Set<string>>(new Set())
  const [workspacePolicies, setWorkspacePolicies] = useState<AttachedPolicy[]>([])
  const [workspaceDefaultIds, setWorkspaceDefaultIds] = useState<Set<string>>(new Set())
  const [supported, setSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    void (async () => {
      const [policiesResult, workspaceResult] = await Promise.allSettled([
        client.getAgentPolicies(agentId),
        client.getWorkspacePolicies().catch(() => ({ workspace_id: null, workspace_name: null, policies: [] }))
      ])
      if (cancelled) return
      if (policiesResult.status === 'fulfilled') {
        setPolicies(policiesResult.value.policies ?? [])
        setExcludedPolicyIds(new Set(policiesResult.value.excluded_policy_refs ?? []))
        setSupported(policiesResult.value.supported !== false)
      } else {
        setError(policiesResult.reason instanceof Error ? policiesResult.reason.message : 'Failed to load policies')
      }
      if (workspaceResult.status === 'fulfilled') {
        const wp = workspaceResult.value.policies ?? []
        setWorkspacePolicies(wp)
        setWorkspaceDefaultIds(new Set(wp.map(p => p.policy_id)))
      }
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [client, agentId])

  // The PUT endpoint expects the canonical set (not a delta), so we always
  // send the post-mutation ids and roll back optimistic state on failure.
  const persist = useCallback(
    async (
      nextPolicies: AttachedPolicy[],
      nextExcluded: string[],
      previousPolicies: AttachedPolicy[],
      previousExcluded: Set<string>
    ) => {
      setPolicies(nextPolicies)
      setExcludedPolicyIds(new Set(nextExcluded))
      setError(null)
      try {
        // The registry endpoint rejects any non-uuid ref with 422, which would
        // otherwise brick agents that still carry legacy slug refs (e.g. from an
        // older seed) — you couldn't even remove them. Strip non-uuid refs so the
        // save always succeeds and the legacy slugs self-heal on the next write.
        await client.setAgentPolicies(
          agentId,
          nextPolicies.map(p => p.policy_id).filter(isPolicyUuid),
          nextExcluded.filter(isPolicyUuid)
        )
      } catch (err) {
        setPolicies(previousPolicies)
        setExcludedPolicyIds(previousExcluded)
        setError(err instanceof Error ? err.message : 'Failed to persist policies')
      }
    },
    [agentId, client]
  )

  // The modal returns the full desired set; we treat it as additive (removals
  // happen through the per-chip control). Re-including an excluded default is
  // handled by dropping it from the exclusion set.
  const applyPicked = useCallback(
    (picked: PickedPolicy[]) => {
      const nextPolicies = [...policies]
      const nextExcluded = new Set(excludedPolicyIds)
      const explicitSeen = new Set(policies.map(p => p.policy_id))

      let changed = false
      for (const p of picked) {
        if (workspaceDefaultIds.has(p.id)) {
          if (nextExcluded.has(p.id)) {
            nextExcluded.delete(p.id)
            changed = true
          }
        } else if (!explicitSeen.has(p.id)) {
          nextPolicies.push({ policy_id: p.id, title: p.title })
          explicitSeen.add(p.id)
          changed = true
        }
      }
      if (changed) {
        persist(nextPolicies, Array.from(nextExcluded), policies, excludedPolicyIds).catch(() => {})
      }
    },
    [persist, policies, excludedPolicyIds, workspaceDefaultIds]
  )

  const removePolicy = useCallback(
    (policyId: string, isDefault?: boolean) => {
      if (isDefault) {
        const nextExcluded = new Set(excludedPolicyIds)
        nextExcluded.add(policyId)
        persist(policies, Array.from(nextExcluded), policies, excludedPolicyIds).catch(() => {})
      } else {
        const nextPolicies = policies.filter(p => p.policy_id !== policyId)
        persist(nextPolicies, Array.from(excludedPolicyIds), policies, excludedPolicyIds).catch(() => {})
      }
    },
    [persist, policies, excludedPolicyIds]
  )

  const effectivePolicies = useMemo<EffectivePolicy[]>(() => {
    const list: EffectivePolicy[] = []
    for (const wp of workspacePolicies) {
      if (!excludedPolicyIds.has(wp.policy_id)) {
        list.push({ ...wp, isDefault: true })
      }
    }
    for (const p of policies) {
      if (!workspaceDefaultIds.has(p.policy_id)) {
        list.push({ ...p, isDefault: false })
      }
    }
    return list
  }, [workspacePolicies, excludedPolicyIds, policies, workspaceDefaultIds])

  const attachedPolicyIds = useMemo(() => policies.map(p => p.policy_id), [policies])

  return {
    supported,
    isLoading,
    error,
    effectivePolicies,
    attachedPolicyIds,
    workspaceDefaultIds,
    excludedPolicyIds,
    applyPicked,
    removePolicy
  }
}
