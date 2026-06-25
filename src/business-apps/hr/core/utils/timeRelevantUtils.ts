export type TimeRelevantWorkingCondition = {
  activeFrom?: string | null
  activeTo?: string | null
  contractType?: {
    objectValue?: Record<string, unknown> | null
  }
}

export const isContractTimeRelevant = (
  employee: { workingCondition?: TimeRelevantWorkingCondition[] } | null
): boolean => {
  if (!employee?.workingCondition?.length) return true

  const today = new Date().toISOString()
  const activeCondition = employee.workingCondition.find(workingCondition => {
    const from = workingCondition.activeFrom
    const to = workingCondition.activeTo
    if (from && from > today) return false
    if (to && to < today) return false
    return true
  })

  const condition = activeCondition ?? employee.workingCondition[employee.workingCondition.length - 1]
  const objectValue = condition?.contractType?.objectValue
  if (!objectValue || typeof objectValue !== 'object') return true

  return objectValue.time_relevant !== false
}
