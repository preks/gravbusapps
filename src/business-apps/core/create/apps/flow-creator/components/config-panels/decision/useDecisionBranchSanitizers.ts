import { useEffect } from 'react'
import type { DecisionNodeConfig } from '../../../types/studioTypes'

const sameOptionList = (
  a: Array<{ id: string; label: string }> | undefined,
  b: Array<{ id: string; label: string }>
): boolean => {
  if (!Array.isArray(a)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id || '') !== String(b[i]?.id || '')) return false
    if (String(a[i]?.label || '') !== String(b[i]?.label || '')) return false
  }
  return true
}

export function useDecisionBranchSanitizers(
  config: DecisionNodeConfig,
  update: (partial: Partial<DecisionNodeConfig>) => void
) {
  useEffect(() => {
    const branches = Array.isArray(config.branches) ? config.branches : []
    if (branches.length === 0) return
    const branchIds = new Set(branches.map(b => String(b.id || '').trim()).filter(Boolean))
    const fallbackBranchId = String(branches[0].id || '').trim()
    if (!fallbackBranchId) return

    const next: Partial<DecisionNodeConfig> = {}

    const labelsLower = branches.map(b =>
      String(b.label || '')
        .trim()
        .toLowerCase()
    )
    const isApprovalOutcomes =
      branches.length === 2 &&
      ((labelsLower[0] &&
        labelsLower[1] &&
        labelsLower[0].startsWith('approve') &&
        labelsLower[1].startsWith('reject')) ||
        (labelsLower[0] &&
          labelsLower[1] &&
          labelsLower[1].startsWith('approve') &&
          labelsLower[0].startsWith('reject')))

    // defaultBranch must always exist and point to a branch id.
    const def = String(config.defaultBranch || '').trim()
    const nextDefault = def && branchIds.has(def) ? def : fallbackBranchId
    if (nextDefault !== config.defaultBranch) next.defaultBranch = nextDefault

    // LOGIC: ensure all conditions reference a valid branch.
    const conds = config.logicConfig?.conditions
    if (Array.isArray(conds) && conds.length > 0) {
      let changed = false
      const nextConds = conds.map(c => {
        const bid = String(c?.branchId || '').trim()
        if (bid && branchIds.has(bid)) return c
        changed = true
        return { ...c, branchId: nextDefault }
      })
      if (changed) next.logicConfig = { ...(config.logicConfig as any), conditions: nextConds }
    }

    // AI (TASK_EXPERT): ensure mapping targets a valid branch.
    const ai = config.aiConfig as any
    if (ai?.executor === 'TASK_EXPERT') {
      const mapping = ai?.mapping?.conditions
      if (Array.isArray(mapping) && mapping.length > 0) {
        let changed = false
        const nextMapping = mapping.map((c: any) => {
          const bid = String(c?.branchId || '').trim()
          if (bid && branchIds.has(bid)) return c
          changed = true
          return { ...c, branchId: nextDefault }
        })
        if (changed) next.aiConfig = { ...ai, mapping: { conditions: nextMapping } }
      }
    }

    // USER: keep userConfig.options in sync with branches (backend uses branches as source of truth).
    if (config.decisionMode === 'USER' && config.userConfig) {
      const expected = branches.map(b => ({ id: String(b.id || ''), label: String(b.label || '') }))
      if (!sameOptionList(config.userConfig.options, expected)) {
        next.userConfig = { ...(config.userConfig as any), options: expected }
      }
    }

    // Backwards compatibility: migrate userConfig.rejectRework -> decision.rejectRework.
    const legacyReject = (config.userConfig as any)?.rejectRework
    if (!config.rejectRework && legacyReject && typeof legacyReject === 'object') {
      next.rejectRework = legacyReject
    }

    // Auto-derive userDecisionType from outcomes (approval vs custom).
    if (config.userConfig) {
      const desired = isApprovalOutcomes ? 'APPROVAL' : 'CUSTOM'
      const current = String((config.userConfig as any)?.userDecisionType || '')
        .trim()
        .toUpperCase()
      if (current !== desired) {
        next.userConfig = { ...(next.userConfig ?? config.userConfig), userDecisionType: desired } as any
      }
    }

    // Reject behavior only makes sense for approval outcomes.
    if (!isApprovalOutcomes) {
      if (config.rejectRework) next.rejectRework = undefined
      if ((config.userConfig as any)?.rejectRework) {
        next.userConfig = { ...(next.userConfig ?? config.userConfig), rejectRework: undefined } as any
      }
    }

    if (Object.keys(next).length > 0) update(next)
  }, [config, update])
}
