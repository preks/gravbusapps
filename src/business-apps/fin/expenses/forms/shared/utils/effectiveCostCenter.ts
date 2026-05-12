import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export type EmployeePositionCostCenterLike = {
  structureId?: string | null
  costCenterId?: string | null
  costCenter?: { id?: string | null; name?: string | null } | null
}

export const MANUAL_MAIN_COST_CENTER_ID_KEY = 'manualMainCostCenterId'

const getPositionCostCenterId = (position: EmployeePositionCostCenterLike): string => {
  return position.costCenterId || position.costCenter?.id || ''
}

const getPositionCostCenterName = (position: EmployeePositionCostCenterLike): string => {
  return position.costCenter?.name || ''
}

export const resolveEffectiveCostCenterId = (
  positions: EmployeePositionCostCenterLike[] | null | undefined,
  fallbackCostCenterId: string = ''
): string => {
  if (!positions || positions.length === 0) {
    return fallbackCostCenterId
  }

  const activeStructureId = getCurrentActiveStructureId()
  if (activeStructureId) {
    const activePosition = positions.find(position => position.structureId === activeStructureId)
    const activeCostCenterId = activePosition ? getPositionCostCenterId(activePosition) : ''
    if (activeCostCenterId) {
      return activeCostCenterId
    }
  }

  const firstCostCenterId = positions.map(getPositionCostCenterId).find(Boolean)
  return firstCostCenterId || fallbackCostCenterId
}

export const resolveEffectiveCostCenterName = (
  positions: EmployeePositionCostCenterLike[] | null | undefined,
  fallbackCostCenterName: string = ''
): string => {
  if (!positions || positions.length === 0) {
    return fallbackCostCenterName
  }

  const activeStructureId = getCurrentActiveStructureId()
  if (activeStructureId) {
    const activePosition = positions.find(position => position.structureId === activeStructureId)
    const activeCostCenterName = activePosition ? getPositionCostCenterName(activePosition) : ''
    if (activeCostCenterName) {
      return activeCostCenterName
    }
  }

  const firstCostCenterName = positions.map(getPositionCostCenterName).find(Boolean)
  return firstCostCenterName || fallbackCostCenterName
}

export const resolveManualMainCostCenterId = (
  additionalProperties: Record<string, unknown> | null | undefined
): string => {
  const manualCostCenterId = additionalProperties?.[MANUAL_MAIN_COST_CENTER_ID_KEY]
  return typeof manualCostCenterId === 'string' ? manualCostCenterId : ''
}

export const resolveMainCostCenterId = (
  positions: EmployeePositionCostCenterLike[] | null | undefined,
  fallbackCostCenterId: string = '',
  additionalProperties?: Record<string, unknown> | null
): string => {
  return (
    resolveManualMainCostCenterId(additionalProperties) || resolveEffectiveCostCenterId(positions, fallbackCostCenterId)
  )
}

export const applyEffectiveCostCenterToRows = <T extends { costCenterId?: string | null; costCenter?: string | null }>(
  rows: T[] | null | undefined,
  costCenterId: string
): T[] => {
  if (!rows || rows.length === 0) {
    return []
  }

  return rows.map(row => ({
    ...row,
    costCenterId: row.costCenterId === undefined ? row.costCenterId : costCenterId,
    costCenter: row.costCenter === undefined ? row.costCenter : costCenterId
  }))
}

export const isAllowanceCostCenterDrivenItem = (
  item: { expenseClassRef?: string | null; expenseGroupRef?: string | null } | null | undefined
): boolean => {
  const expenseClassRef = item?.expenseClassRef?.toLowerCase() || ''
  const expenseGroupRef = item?.expenseGroupRef?.toLowerCase() || ''
  return expenseClassRef.includes('allowance') || expenseGroupRef.includes('allowance')
}

export const resolveItemCostCenterId = (
  item: { costCenterId?: string | null; expenseClassRef?: string | null; expenseGroupRef?: string | null },
  effectiveCostCenterId: string,
  inheritedCostCenterId: string = ''
): string => {
  if (isAllowanceCostCenterDrivenItem(item)) {
    if (!item.costCenterId || item.costCenterId === inheritedCostCenterId) {
      return effectiveCostCenterId
    }

    return item.costCenterId
  }

  return item.costCenterId || ''
}

export const resolveInheritedOrSelectedCostCenterId = (
  costCenterId: string | null | undefined,
  effectiveCostCenterId: string,
  inheritedCostCenterId: string = ''
): string => {
  if (!costCenterId || costCenterId === inheritedCostCenterId) {
    return effectiveCostCenterId
  }

  return costCenterId
}
