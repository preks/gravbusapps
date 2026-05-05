export type ReportSectionKind = 'investmentType' | 'liquidFundType' | 'group'

const LIQUID_FUND_REQUIRED_SUBTYPE_KEY = 'liquidFundInvestment'

/**
 * Interface for a sub-section within a report tab
 */
export interface SubSection {
  id: string // URL-friendly identifier (e.g., 'venture-capital')
  code: string // Catalog code (e.g., 'VENTURE_CAPITAL')
  value: string // Display value (e.g., 'Venture Capital')
  label: string // Same as value (for consistency)
  kind: ReportSectionKind
}

const parseObjectValue = (objectValue: unknown): any => {
  if (!objectValue) return null
  if (typeof objectValue === 'string') {
    try {
      return JSON.parse(objectValue)
    } catch {
      return null
    }
  }
  return objectValue
}

const getRequiredSubtypeKey = (objectValue: unknown): string => {
  return parseObjectValue(objectValue)?.requiredSubtypeKey ?? ''
}

const getTranslatedLabel = (entry: any): string => {
  return entry?.translations?.[0]?.value || entry?.value || entry?.code || ''
}

const getSortOrder = (entry: any): number => Number.parseInt(entry?.additionalValue1 || '0', 10)

const belongsToParent = (entry: any, parent: any): boolean => {
  return (
    entry?.parentEntryId === parent?.id ||
    entry?.parentEntry?.id === parent?.id ||
    entry?.parentEntry?.code === parent?.code
  )
}

const buildSubSection = (entry: any, kind: ReportSectionKind): SubSection | undefined => {
  const code = entry?.code
  if (!code) return undefined

  const label = getTranslatedLabel(entry)
  return {
    id: code.toLowerCase().replaceAll('_', '-'),
    code,
    value: label,
    label,
    kind
  }
}

const sortCatalogEntries = (a: any, b: any): number => {
  const orderA = getSortOrder(a)
  const orderB = getSortOrder(b)
  if (orderA !== orderB) return orderA - orderB
  return getTranslatedLabel(a).localeCompare(getTranslatedLabel(b))
}

export const shouldUseLiquidFundTypeSections = (groupEntry: any, catalogData: any): boolean => {
  return (
    getRequiredSubtypeKey(groupEntry?.objectValue) === LIQUID_FUND_REQUIRED_SUBTYPE_KEY &&
    Boolean(catalogData?.investmentLiquidFundTypes?.length)
  )
}

const buildGroupSection = (groupCode: string, groupEntry?: any): SubSection => {
  const label = getTranslatedLabel(groupEntry) || 'Overview'
  return {
    id: 'overview',
    code: groupCode,
    value: label,
    label: label === groupCode ? 'Overview' : label,
    kind: 'group'
  }
}

/**
 * Resolve report sub-sections from catalog data, matching the investment view
 * cascade: liquid fund subtype entries first when the group requires them,
 * otherwise investment types, otherwise the group-level overview.
 */
export const resolveReportSubSections = (groupCode: string, catalogData: any): SubSection[] => {
  const groupEntry = catalogData?.investmentGroups?.find((entry: any) => entry.code === groupCode)

  if (shouldUseLiquidFundTypeSections(groupEntry, catalogData)) {
    return [...(catalogData.investmentLiquidFundTypes as any[])]
      .sort(sortCatalogEntries)
      .map(entry => buildSubSection(entry, 'liquidFundType'))
      .filter((section): section is SubSection => Boolean(section))
  }

  const investmentTypeEntries = (catalogData?.investmentTypes ?? []).filter((entry: any) =>
    belongsToParent(entry, groupEntry)
  )

  if (investmentTypeEntries.length > 0) {
    return [...investmentTypeEntries]
      .sort(sortCatalogEntries)
      .map((entry: any) => buildSubSection(entry, 'investmentType'))
      .filter((section: SubSection | undefined): section is SubSection => Boolean(section))
  }

  return [buildGroupSection(groupCode, groupEntry)]
}

export const resolveRecordReportSubSection = (
  groupCode: string,
  catalogData: any,
  investment: any,
  typeSpecificData: any
): SubSection => {
  const groupEntry = catalogData?.investmentGroups?.find((entry: any) => entry.code === groupCode)

  if (shouldUseLiquidFundTypeSections(groupEntry, catalogData)) {
    const liquidFundType =
      typeSpecificData?.liquidFundInvestment?.investmentLiquidFundType ||
      investment?.liquidFundInvestment?.investmentLiquidFundType
    const liquidFundSection = buildSubSection(liquidFundType, 'liquidFundType')
    if (liquidFundSection) return liquidFundSection
  }

  const investmentTypeSection = buildSubSection(investment?.investmentType, 'investmentType')
  return investmentTypeSection ?? buildGroupSection(groupCode, groupEntry)
}
