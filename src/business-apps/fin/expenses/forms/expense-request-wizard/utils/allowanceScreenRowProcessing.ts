import { resolveInheritedOrSelectedCostCenterId } from '../../shared/utils/effectiveCostCenter'
import { DEDUCTION_KEYS } from '../constants/constants'

export type AllowanceRowProcessContext = {
  requestProject: any
  tripData: any[]
  defaultCostCenter: string
  hasDeductions: boolean
  getDeductionByDate: (date: string) => any | null
  visibleDeductionKeys: string[]
}

function getRequestProjectIdForAllowanceDate(requestProject: any, expenseDate: string | null | undefined) {
  const project = requestProject?.project
  if (!project?.id) {
    return undefined
  }

  if (project.validTo && expenseDate && new Date(project.validTo) <= new Date(expenseDate)) {
    return undefined
  }

  return project.id
}

function applyCostCenterAndProjectToAllowanceRow(updatedElement: any, requestProject: any, defaultCostCenter: string) {
  const resolvedCostCenterId = resolveInheritedOrSelectedCostCenterId(
    updatedElement.costCenterId,
    defaultCostCenter,
    requestProject.costCenterId || ''
  )

  if (defaultCostCenter && updatedElement.costCenterId !== resolvedCostCenterId) {
    updatedElement.costCenterId = resolvedCostCenterId
    updatedElement.projectId = undefined
  }

  if (updatedElement.projectId) {
    return
  }

  const requestProjectId = getRequestProjectIdForAllowanceDate(requestProject, updatedElement.expenseDate)
  if (requestProjectId) {
    updatedElement.projectId = requestProjectId
  }
}

function applyTripFieldsToAllowanceRow(updatedElement: any, element: any, tripData: any[]) {
  const tripMatch = tripData.find((trip: any) => trip.tripOrder === element.itemOrder)
  updatedElement.travelRegionRef = tripMatch ? tripMatch.travelRegionRef : null
  updatedElement.allowanceRegionRuleDetailId =
    tripMatch?.allowanceRegionRuleDetailId != null ? tripMatch.allowanceRegionRuleDetailId : null
}

function buildDeductionKeysFromDay(dd: any, visibleDeductionKeys: string[]): string[] {
  const initialDeductions: string[] = []
  if (dd.breakfast && visibleDeductionKeys.includes(DEDUCTION_KEYS.BREAKFAST)) {
    initialDeductions.push(DEDUCTION_KEYS.BREAKFAST)
  }
  if (dd.lunch && visibleDeductionKeys.includes(DEDUCTION_KEYS.LUNCH)) {
    initialDeductions.push(DEDUCTION_KEYS.LUNCH)
  }
  if (dd.dinner && visibleDeductionKeys.includes(DEDUCTION_KEYS.DINNER)) {
    initialDeductions.push(DEDUCTION_KEYS.DINNER)
  }
  if (dd.overnight && visibleDeductionKeys.includes(DEDUCTION_KEYS.OVERNIGHT)) {
    initialDeductions.push(DEDUCTION_KEYS.OVERNIGHT)
  }
  return initialDeductions
}

function applyDeductionsToAllowanceRow(
  updatedElement: any,
  hasDeductions: boolean,
  getDeductionByDate: (date: string) => any | null,
  visibleDeductionKeys: string[]
) {
  if (!hasDeductions) {
    updatedElement.deductionDay = null
    return
  }

  const dd = getDeductionByDate(updatedElement.expenseDate)
  if (dd) {
    updatedElement.deductionDay = {
      id: dd.id ?? null,
      version: dd.version ?? 0,
      deductionDay: null,
      breakfast: !!dd.breakfast,
      lunch: !!dd.lunch,
      dinner: !!dd.dinner,
      overnight: !!dd.overnight
    }
    updatedElement.deductions = buildDeductionKeysFromDay(dd, visibleDeductionKeys)
  } else {
    updatedElement.deductionDay = {
      id: null,
      version: 0,
      deductionDay: null,
      breakfast: false,
      lunch: false,
      dinner: false,
      overnight: false
    }
    updatedElement.deductions = []
  }
}

/**
 * Maps a raw allowance row to the shape used by AllowanceScreen (cost center, project, trip, deductions).
 */
export function processAllowanceDataRow(element: any, ctx: AllowanceRowProcessContext): any {
  const updatedElement = { ...element }
  applyCostCenterAndProjectToAllowanceRow(updatedElement, ctx.requestProject, ctx.defaultCostCenter)
  applyTripFieldsToAllowanceRow(updatedElement, element, ctx.tripData)
  applyDeductionsToAllowanceRow(updatedElement, ctx.hasDeductions, ctx.getDeductionByDate, ctx.visibleDeductionKeys)
  return updatedElement
}
