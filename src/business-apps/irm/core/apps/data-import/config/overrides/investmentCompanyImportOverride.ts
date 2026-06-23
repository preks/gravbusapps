/**
 * Investment Company Import Override
 *
 * Defers ownership relationship submission to the optional Step 4 flow so
 * users can import companies first, then upload the same or a different
 * file to build ownership associations.
 */

import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export const investmentCompanyImportOverride: Partial<ImportConfig> = {
  deferOwnershipSubmission: true,
  // Surface IRM-only relationship columns on the Step 2 mapping review.
  // These columns intentionally don't have a direct target field on
  // `InvestmentCompany`; Flowbot processes them during extraction:
  //   * Owned By / Owns -> investmentCompanyOwnership
  //   * Executives / Executive Type -> investmentCompanyExecutives
  //   * Stakeholders -> investmentCompanyStakeholders
  // The banner explains this so the user doesn't think the columns are
  // being dropped when they show up in the "Unmatched" tray.
  relationshipColumnHints: [
    'relationship-hint-company-columns',
    'relationship-hint-percentages',
    'relationship-hint-executives',
    'relationship-hint-executive-type',
    'relationship-hint-stakeholders'
  ],
  ownershipStep: {
    relationshipColumnHints: ['relationship-hint-company-columns', 'relationship-hint-percentages']
  }
}
