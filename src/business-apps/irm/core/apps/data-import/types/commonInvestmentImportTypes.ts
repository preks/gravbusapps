/**
 * Common Investment Import Types
 * Shared type definitions for investment imports across all investment types
 */

import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

/**
 * Descriptor for an `InvestmentGroup` catalog entry used as a data-import
 * card entry. Produced by `toInvestmentImportGroupDescriptors` from raw
 * catalog entries.
 */
export interface InvestmentImportGroupDescriptor {
  /** Catalog entry id (e.g. 'InvestmentGroup:v1:REAL_ESTATE'). */
  id: string
  /** Normalized catalog code (e.g. 'REAL_ESTATE'). */
  code: string
  /** Localized display label (falls back to title-cased code). */
  label: string
  /** URL-safe tab id (e.g. 'real-estate'). */
  tabId: string
  /** Full entity type used as `DataImportLayout` view key (e.g. 'real-estate-investment'). */
  entityType: string
}

/**
 * i18n key slots for the generic investment import view. Overrides in
 * `GROUP_IMPORT_CONFIGURATIONS` can set any of these to a curated key; when
 * unset the generic keys (`page-title-generic`, …) are used with
 * `$groupLabel` argument substitution.
 */
export interface InvestmentImportViewLabels {
  pageTitleKey?: string
  pageDescriptionKey?: string
  entityTypePluralKey?: string
  entityTypeSingularKey?: string
  /** Used to derive the `data-testid` prefix (defaults to `{tabId}-investment-import-view`). */
  dataTestIdPrefix?: string
}

/**
 * Fully resolved definition for a single investment group's import flow:
 * its catalog descriptor, merged `ImportConfig`, and label slots.
 */
export interface InvestmentGroupImportDefinition {
  group: InvestmentImportGroupDescriptor
  importConfig: ImportConfig
  labels: InvestmentImportViewLabels
}
