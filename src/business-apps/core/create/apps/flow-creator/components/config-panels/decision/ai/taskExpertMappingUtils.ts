import type { DecisionNodeConfig } from '../../../../types/studioTypes'

export function buildDefaultTaskExpertMapping(
  branches: DecisionNodeConfig['branches'],
  decisionResultEnumOptions?: string[]
): { conditions: Array<{ expression: string; branchId: string }> } {
  const branchId = branches[0]?.id ?? ''
  const value = String(decisionResultEnumOptions?.[0] ?? '').trim()
  const escapedValue = value.split("'").join(String.raw`\'`)
  const rhs = value ? `'${escapedValue}'` : "''"
  return {
    conditions: [
      {
        expression: `{{$steps.self.resultData.decisionResult}} == ${rhs}`,
        branchId
      }
    ]
  }
}
