import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export type InvestmentUiSubtype = 'equity' | 'real_estate' | 'liquid_fund' | 'generic'

const CORE_GROUP_TO_SUBTYPE: Record<string, Exclude<InvestmentUiSubtype, 'generic'>> = {
  EQUITY: 'equity',
  REAL_ESTATE: 'real_estate',
  LIQUID_FUND: 'liquid_fund'
}

const SUBTYPE_TO_FLOW_CONTEXT: Record<InvestmentUiSubtype, FlowContextName> = {
  equity: FlowContextName.equityInvestmentEntity,
  real_estate: FlowContextName.realEstateInvestmentEntity,
  liquid_fund: FlowContextName.liquidFundInvestmentEntity,
  generic: FlowContextName.investmentEntity
}

const normalizeCatalogCode = (code?: string | null): string | undefined => {
  if (!code || typeof code !== 'string') return undefined
  const normalized = code.split(':').pop()?.trim().toUpperCase()
  return normalized || undefined
}

const getSubtypeByCode = (code?: string | null): InvestmentUiSubtype => {
  const normalizedCode = normalizeCatalogCode(code)
  if (!normalizedCode) return 'generic'
  return CORE_GROUP_TO_SUBTYPE[normalizedCode] ?? 'generic'
}

export const getInvestmentUiSubtypeFromData = (investmentData: any): InvestmentUiSubtype => {
  if (!investmentData) return 'generic'

  const groupSubtype = getSubtypeByCode(investmentData.investmentGroup?.code)
  if (groupSubtype !== 'generic') return groupSubtype

  const parentGroupCode = investmentData.investmentType?.parentEntryId?.split(':').pop()
  const parentSubtype = getSubtypeByCode(parentGroupCode)
  if (parentSubtype !== 'generic') return parentSubtype

  return getSubtypeByCode(investmentData.investmentType?.code)
}

export const getFlowContextForInvestment = (investmentData: any): FlowContextName => {
  return SUBTYPE_TO_FLOW_CONTEXT[getInvestmentUiSubtypeFromData(investmentData)]
}

export const getFlowContextForInvestmentSubtype = (investmentSubtype: string): FlowContextName => {
  const normalizedSubtype = (investmentSubtype || '').toLowerCase()
  if (normalizedSubtype === 'equity') return FlowContextName.equityInvestmentEntity
  if (normalizedSubtype === 'real_estate' || normalizedSubtype === 'realestate') {
    return FlowContextName.realEstateInvestmentEntity
  }
  if (normalizedSubtype === 'liquid_fund' || normalizedSubtype === 'liquidfund') {
    return FlowContextName.liquidFundInvestmentEntity
  }
  return FlowContextName.investmentEntity
}
