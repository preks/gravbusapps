import type { BadgeProps } from '@newwork/nw-design-system'

/**
 * Extracts the badge variant from a catalog entry's objectValue field
 * @param catalogEntry - The catalog entry containing objectValue
 * @returns The badge variant to be used or undefined if not found
 */
export function getBadgeVariantFromCatalog(
  catalogEntry?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  if (!catalogEntry?.objectValue) {
    return 'default'
  }

  try {
    // Parse objectValue if it's a string, otherwise use it directly
    const objectValue =
      typeof catalogEntry.objectValue === 'string' ? JSON.parse(catalogEntry.objectValue) : catalogEntry.objectValue

    // Return the badgeVariant if it exists and is a valid variant
    const badgeVariant = objectValue?.badgeVariant
    if (badgeVariant && typeof badgeVariant === 'string') {
      return badgeVariant as BadgeProps['variant']
    }
  } catch (error) {
    console.warn('Failed to parse catalog entry objectValue:', error)
  }

  // Fallback to default variant
  return 'default'
}

/**
 * Returns the appropriate badge variant based on winning chance percentage
 * @param winningChance - The winning chance percentage (0-100)
 * @returns Badge variant based on the percentage ranges
 */
export function getWinningChanceBadgeVariant(winningChance?: number): BadgeProps['variant'] {
  if (winningChance === undefined || winningChance === null) {
    return 'outline'
  }

  if (winningChance >= 75) {
    return 'success' // Green for high chance (75-100%)
  } else if (winningChance >= 50) {
    return 'info' // Blue for medium-high chance (50-74%)
  } else if (winningChance >= 25) {
    return 'warning' // Orange for medium chance (25-49%)
  } else {
    return 'destructive' // Red for low chance (0-24%)
  }
}

/**
 * Utility function specifically for lead status badges
 */
export function getLeadStatusBadgeVariant(
  leadStatus?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(leadStatus)
}

/**
 * Utility function specifically for lead rating badges
 */
export function getLeadRatingBadgeVariant(
  leadRating?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  // First check if catalog has objectValue with badgeVariant
  const catalogVariant = getBadgeVariantFromCatalog(leadRating)
  if (catalogVariant !== 'default') {
    return catalogVariant
  }

  // Fallback to value-based logic for string ratings
  const ratingValue = leadRating?.value?.toLowerCase()
  switch (ratingValue) {
    case 'hot':
      return 'destructive' // Red for hot leads
    case 'warm':
      return 'default' // Blue for warm leads
    case 'cold':
      return 'secondary' // Gray for cold leads
    default:
      return 'outline' // Default for unknown values
  }
}

/**
 * Utility function specifically for account type badges
 */
export function getAccountTypeBadgeVariant(
  accountType?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(accountType)
}

/**
 * Utility function specifically for industry badges
 */
export function getIndustryBadgeVariant(
  industry?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(industry)
}

/**
 * Utility function specifically for opportunity stage badges
 */
export function getOpportunityStageBadgeVariant(
  stage?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(stage)
}

/**
 * Utility function specifically for sales pipeline stage badges
 */
export function getSalesPipelineStageBadgeVariant(
  pipelineStage?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(pipelineStage)
}

/**
 * Returns the appropriate badge variant based on quality level
 * @param qualityLevel - The quality level ('high', 'low', 'medium', etc.)
 * @returns Badge variant based on the quality level
 */
export function getQualityLevelBadgeVariant(qualityLevel?: string): BadgeProps['variant'] {
  switch (qualityLevel) {
    case 'high':
      return 'success'
    case 'low':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * Utility function specifically for opportunity status badges
 * Determines the badge variant based on catalog objectValue or status string matching
 * @param status - The opportunity status catalog entry containing value and objectValue
 * @returns Badge variant based on status keywords
 */
export function getOpportunityStatusBadgeVariant(
  status?: {
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  // First check if catalog has objectValue with badgeVariant
  const catalogVariant = getBadgeVariantFromCatalog(status)
  if (catalogVariant !== 'default') {
    return catalogVariant
  }

  // Fallback to value-based keyword matching
  const statusValue = status?.value?.toLowerCase()
  if (!statusValue) return 'default'
  const statusLower = statusValue
  if (statusLower.includes('open')) return 'secondary'
  if (statusLower.includes('active')) return 'info'
  if (statusLower.includes('won') || statusLower.includes('closed won')) return 'success'
  if (statusLower.includes('lost') || statusLower.includes('closed lost')) return 'destructive'
  if (statusLower.includes('rejected')) return 'destructive'
  if (statusLower.includes('qualified')) return 'info'
  if (statusLower.includes('converted')) return 'success'
  return 'default'
}

/**
 * Utility function for account priority badges
 * Determines badge variant based on priority type value
 * @param priority - The account priority catalog entry containing type/value
 * @returns Badge variant based on type: HIGH -> success, MEDIUM -> info, LOW -> warning, NONE -> offline
 */
export function getAccountPriorityBadgeVariant(
  priority?: {
    type?: string
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  // First check if catalog has objectValue with badgeVariant
  const catalogVariant = getBadgeVariantFromCatalog(priority)
  if (catalogVariant !== 'default') {
    return catalogVariant
  }

  // Fallback to type-based mapping
  const typeValue = priority?.type?.toUpperCase()
  switch (typeValue) {
    case 'HIGH':
      return 'success'
    case 'MEDIUM':
      return 'info'
    case 'LOW':
      return 'warning'
    case 'NONE':
      return 'offline'
    default:
      return 'default'
  }
}

/**
 * Utility function for opportunity forecast badges
 * Determines badge variant based on forecast type value
 * @param forecast - The opportunity forecast catalog entry containing type/value
 * @returns Badge variant based on type: HIGH -> success, MEDIUM -> info, LOW -> warning, NONE -> offline
 */
export function getOpportunityForecastBadgeVariant(
  forecast?: {
    type?: string
    value?: string
    objectValue?: any
  } | null
): BadgeProps['variant'] {
  // First check if catalog has objectValue with badgeVariant
  const catalogVariant = getBadgeVariantFromCatalog(forecast)
  if (catalogVariant !== 'default') {
    return catalogVariant
  }

  // Fallback to type-based mapping
  const typeValue = forecast?.type?.toUpperCase()
  switch (typeValue) {
    case 'HIGH':
      return 'success'
    case 'MEDIUM':
      return 'info'
    case 'LOW':
      return 'warning'
    case 'NONE':
      return 'offline'
    default:
      return 'default'
  }
}
