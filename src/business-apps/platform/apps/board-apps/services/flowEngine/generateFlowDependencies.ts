/**
 * Generates predecessor dependencies for board rows that were imported from
 * Flow Engine, using the template step graph to determine task ordering.
 *
 * Merge semantics: only within-flow deps are generated; existing manual
 * cross-flow deps are preserved.
 */

import type { BoardRow, DependencyMeta } from '../../types'
import type { FlowTemplateDefinition } from './flowEngineTypes'
import { getTemplate } from './flowEngineClient'

export interface GeneratedDep {
  rowId: string
  predecessorIds: string[]
  depMeta: DependencyMeta
}

/**
 * For each template step, collect all step indices that lead into it.
 * Returns a Map<stepIndex, Set<predecessorStepIndex>>.
 */
function buildPredecessorMap(template: FlowTemplateDefinition): Map<number, Set<number>> {
  const predMap = new Map<number, Set<number>>()

  template.steps.forEach((step, idx) => {
    const targets = new Set<number>()

    if (step.nextStep != null) {
      targets.add(step.nextStep)
    }
    if (step.defaultNextStep != null) {
      targets.add(step.defaultNextStep)
    }
    if (step.branches) {
      for (const branch of step.branches) {
        targets.add(branch.nextStep)
      }
    }
    if (targets.size === 0 && idx + 1 < template.steps.length) {
      targets.add(idx + 1)
    }

    for (const target of targets) {
      if (!predMap.has(target)) predMap.set(target, new Set())
      predMap.get(target)!.add(idx)
    }
  })

  return predMap
}

export async function generateFlowDependencies(rows: BoardRow[], dependencyColumn: string): Promise<GeneratedDep[]> {
  const flowGroups = new Map<string, BoardRow[]>()
  for (const row of rows) {
    const flowId = row.data.flowId as string | undefined
    if (!flowId || row.data.stepIndex == null) continue
    if (!flowGroups.has(flowId)) flowGroups.set(flowId, [])
    flowGroups.get(flowId)!.push(row)
  }

  const templateCache = new Map<string, FlowTemplateDefinition | null>()
  const templateIds = new Set<string>()
  for (const row of rows) {
    const tid = row.data.templateId as string | undefined
    if (tid) templateIds.add(tid)
  }
  await Promise.all(
    Array.from(templateIds).map(async tid => {
      const tmpl = await getTemplate(tid)
      templateCache.set(tid, tmpl)
    })
  )

  const results: GeneratedDep[] = []
  const metaKey = `_dep_${dependencyColumn}`

  for (const [, flowRows] of flowGroups) {
    const sampleRow = flowRows[0]
    const templateId = sampleRow?.data.templateId as string | undefined
    if (!templateId) continue

    const template = templateCache.get(templateId)
    if (!template) continue

    const predMap = buildPredecessorMap(template)

    const rowByStepIndex = new Map<number, BoardRow>()
    for (const row of flowRows) {
      const si = Number(row.data.stepIndex)
      if (!isNaN(si)) rowByStepIndex.set(si, row)
    }

    for (const row of flowRows) {
      const si = Number(row.data.stepIndex)
      if (isNaN(si)) continue

      const predSteps = predMap.get(si)
      if (!predSteps || predSteps.size === 0) continue

      const existingIds: string[] = Array.isArray(row.data[dependencyColumn])
        ? (row.data[dependencyColumn] as string[])
        : []
      const existingMeta: DependencyMeta =
        row.data[metaKey] && typeof row.data[metaKey] === 'object' && !Array.isArray(row.data[metaKey])
          ? (row.data[metaKey] as DependencyMeta)
          : {}

      const flowRowIds = new Set(flowRows.map(r => r.id))
      const manualIds = existingIds.filter(id => !flowRowIds.has(id))
      const manualMeta: DependencyMeta = {}
      for (const id of manualIds) {
        if (existingMeta[id]) manualMeta[id] = existingMeta[id]
      }

      const newIds: string[] = [...manualIds]
      const newMeta: DependencyMeta = { ...manualMeta }

      for (const predStep of predSteps) {
        const predRow = rowByStepIndex.get(predStep)
        if (!predRow || predRow.id === row.id) continue
        if (!newIds.includes(predRow.id)) {
          newIds.push(predRow.id)
        }
        newMeta[predRow.id] = 'FS'
      }

      results.push({ rowId: row.id, predecessorIds: newIds, depMeta: newMeta })
    }
  }

  return results
}
