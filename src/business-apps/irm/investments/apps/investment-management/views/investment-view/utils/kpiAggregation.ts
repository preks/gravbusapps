/**
 * Aggregate list-state results from dynamic group slots into a tabId → state map
 */
export const aggregateDynamicStates = (
  investmentGroups: Array<{ tabId: string }>,
  groupStates: any[]
): Record<string, any> => {
  const states: Record<string, any> = {}

  investmentGroups.forEach((group, index) => {
    if (groupStates[index]) {
      states[group.tabId] = groupStates[index]
    }
  })

  return states
}
