import type { DecisionLogEntry } from '../hooks/useDecisionData'

interface TemplateDecisionBranch {
  id?: string
  label?: string
}

interface TemplateDecisionStep {
  id?: string
  reference?: string
  type?: string
  branches?: TemplateDecisionBranch[]
  defaultBranch?: string
}

export interface AvailableDecisionBranch {
  branchId: string
  branchLabel?: string
  isSelected: boolean
  isDefault: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function resolveDecisionStep(entry: DecisionLogEntry | null | undefined): TemplateDecisionStep | null {
  const reference = String(entry?.stepReference || '').trim()
  const template = asRecord(entry?.originalTemplate)
  const steps = Array.isArray(template?.steps) ? template.steps : []

  if (!reference || !steps.length) return null

  const step = steps.find((candidate, index) => {
    const candidateRecord = asRecord(candidate)
    if (!candidateRecord) return false

    const candidates = [
      String(candidateRecord.reference || '').trim(),
      String(candidateRecord.id || '').trim(),
      `step_${index}`
    ].filter(Boolean)

    return candidates.includes(reference)
  })

  const decisionStep = asRecord(step)
  if (!decisionStep || String(decisionStep.type || '').trim() !== 'DECISION') return null

  return decisionStep as TemplateDecisionStep
}

export function getAvailableDecisionBranches(entry: DecisionLogEntry | null | undefined): AvailableDecisionBranch[] {
  const step = resolveDecisionStep(entry)
  if (!step) return []

  const branches = Array.isArray(step.branches) ? step.branches : []
  const selectedBranchId = String(entry?.selectedBranch || '').trim()
  const defaultBranchId = String(entry?.defaultBranchId || step.defaultBranch || '').trim()

  return branches
    .map(branch => {
      const branchId = String(branch?.id || '').trim()
      if (!branchId) return null

      const branchLabel = String(branch?.label || '').trim() || undefined
      return {
        branchId,
        branchLabel,
        isSelected: branchId === selectedBranchId,
        isDefault: branchId === defaultBranchId
      }
    })
    .filter(Boolean) as AvailableDecisionBranch[]
}
