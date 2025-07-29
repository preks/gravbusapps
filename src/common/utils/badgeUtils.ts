import type { BadgeProps } from '@newwork/nw-design-system';

/**
 * Extracts the badge variant from a catalog entry's objectValue field
 * @param catalogEntry - The catalog entry containing objectValue
 * @returns The badge variant to be used or undefined if not found
 */
export function getBadgeVariantFromCatalog(catalogEntry?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  if (!catalogEntry?.objectValue) {
    return 'default';
  }

  try {
    // Parse objectValue if it's a string, otherwise use it directly
    const objectValue = typeof catalogEntry.objectValue === 'string' 
      ? JSON.parse(catalogEntry.objectValue) 
      : catalogEntry.objectValue;

    // Return the badgeVariant if it exists and is a valid variant
    const badgeVariant = objectValue?.badgeVariant;
    if (badgeVariant && typeof badgeVariant === 'string') {
      return badgeVariant as BadgeProps['variant'];
    }
  } catch (error) {
    console.warn('Failed to parse catalog entry objectValue:', error);
  }

  // Fallback to default variant
  return 'default';
}

/**
 * Returns the appropriate badge variant based on winning chance percentage
 * @param winningChance - The winning chance percentage (0-100)
 * @returns Badge variant based on the percentage ranges
 */
export function getWinningChanceBadgeVariant(winningChance?: number): BadgeProps['variant'] {
  if (winningChance === undefined || winningChance === null) {
    return 'outline';
  }

  if (winningChance >= 75) {
    return 'success';  // Green for high chance (75-100%)
  } else if (winningChance >= 50) {
    return 'info';     // Blue for medium-high chance (50-74%)
  } else if (winningChance >= 25) {
    return 'warning';  // Orange for medium chance (25-49%)
  } else {
    return 'destructive'; // Red for low chance (0-24%)
  }
}

/**
 * Utility function specifically for lead status badges
 */
export function getLeadStatusBadgeVariant(leadStatus?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(leadStatus);
}

/**
 * Utility function specifically for lead rating badges
 */
export function getLeadRatingBadgeVariant(leadRating?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  // First check if catalog has objectValue with badgeVariant
  const catalogVariant = getBadgeVariantFromCatalog(leadRating);
  if (catalogVariant !== 'default') {
    return catalogVariant;
  }

  // Fallback to value-based logic for string ratings
  const ratingValue = leadRating?.value?.toLowerCase();
  switch (ratingValue) {
    case 'hot':
      return 'destructive'; // Red for hot leads
    case 'warm':
      return 'default'; // Blue for warm leads
    case 'cold':
      return 'secondary'; // Gray for cold leads
    default:
      return 'outline'; // Default for unknown values
  }
}

/**
 * Utility function specifically for account type badges
 */
export function getAccountTypeBadgeVariant(accountType?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(accountType);
}

/**
 * Utility function specifically for industry badges
 */
export function getIndustryBadgeVariant(industry?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(industry);
}

/**
 * Utility function specifically for opportunity stage badges
 */
export function getOpportunityStageBadgeVariant(stage?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(stage);
}

/**
 * Utility function specifically for sales pipeline stage badges
 */
export function getSalesPipelineStageBadgeVariant(pipelineStage?: { 
  value?: string; 
  objectValue?: any; 
} | null): BadgeProps['variant'] {
  return getBadgeVariantFromCatalog(pipelineStage);
} 