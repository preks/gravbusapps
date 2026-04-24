/**
 * Registry of known `InvestmentGroup` → `ImportConfig` overrides.
 *
 * Follows the "default + override" principle:
 *  - Every catalog group descriptor is resolved through
 *    `getGroupImportConfiguration`, which starts from a sensible default
 *    (COMMON_INVESTMENT_FIELDS, derived entity type + payload key, generic
 *    i18n keys) and then merges any override registered below.
 *  - Adding a new catalog group lights up end-to-end with zero code
 *    changes. Adding group-specific fields / labels / payload extensions
 *    is a localized change to this file.
 */

import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { COMMON_INVESTMENT_FIELDS } from './commonInvestmentFields'
import {
  equityInvestmentImportOverride,
  liquidFundInvestmentImportOverride,
  realEstateInvestmentImportOverride
} from './overrides'
import {
  InvestmentGroupImportDefinition,
  InvestmentImportGroupDescriptor,
  InvestmentImportViewLabels
} from '../types/commonInvestmentImportTypes'
import { toInvestmentPayloadKey } from './investmentGroupImportUtils'

/**
 * Override files declare only the fields that genuinely differ from the
 * default — `entityType`, `domain`, `investmentPayloadKey`, and
 * `investmentGroupRef` are derived from the catalog descriptor and must
 * not be re-stated. Restricting the override shape with this `Pick`
 * prevents accidental overrides like `investmentPayloadKey: 'realEstate'`
 * showing up under `EQUITY`.
 */
export type InvestmentGroupImportOverridePatch = Partial<
  Pick<ImportConfig, 'targetFields' | 'enforcedSelects' | 'payloadExtensions'>
>

interface InvestmentGroupImportOverride {
  importConfig?: InvestmentGroupImportOverridePatch
  labels?: InvestmentImportViewLabels
}

const GROUP_IMPORT_CONFIGURATIONS: Record<string, InvestmentGroupImportOverride> = {
  EQUITY: {
    importConfig: equityInvestmentImportOverride,
    labels: {
      pageTitleKey: 'page-title-equity',
      pageDescriptionKey: 'page-description-equity',
      entityTypePluralKey: 'entity-plural-equity',
      entityTypeSingularKey: 'entity-singular-equity',
      dataTestIdPrefix: 'equity-investment-import-view'
    }
  },
  REAL_ESTATE: {
    importConfig: realEstateInvestmentImportOverride,
    labels: {
      pageTitleKey: 'page-title-real-estate',
      pageDescriptionKey: 'page-description-real-estate',
      entityTypePluralKey: 'entity-plural-real-estate',
      entityTypeSingularKey: 'entity-singular-real-estate',
      dataTestIdPrefix: 'real-estate-investment-import-view'
    }
  },
  LIQUID_FUND: {
    importConfig: liquidFundInvestmentImportOverride,
    labels: {
      pageTitleKey: 'page-title-liquid-fund',
      pageDescriptionKey: 'page-description-liquid-fund',
      entityTypePluralKey: 'entity-plural-liquid-fund',
      entityTypeSingularKey: 'entity-singular-liquid-fund',
      dataTestIdPrefix: 'liquid-fund-investment-import-view'
    }
  }
}

const createDefaultImportConfig = (group: InvestmentImportGroupDescriptor): ImportConfig => ({
  entityType: group.entityType,
  domain: 'investment',
  targetFields: COMMON_INVESTMENT_FIELDS,
  investmentPayloadKey: group.requiredSubtypeKey || toInvestmentPayloadKey(group.code),
  // Pre-resolved catalog ref so submit doesn't re-query the InvestmentGroup
  // catalog. `investmentGroupCodeHint` is intentionally omitted: it only
  // matters for hand-built configs that don't have a ref.
  investmentGroupRef: group.id,
  enforcedSelects: [
    // Hidden synthetic root: pre-seeds the form with the import view's
    // `InvestmentGroup` ref so `investmentType` can resolve its parent
    // uniformly via `parentSelectId` (no static-parent special case in
    // the rendering layer).
    {
      id: 'investmentGroup',
      targetField: '',
      catalogIdentifier: 'InvestmentGroup',
      defaultParentEntryRef: group.id,
      hidden: true,
      labelKey: 'investment-group-label'
    },
    {
      id: 'investmentType',
      targetField: 'investment.investmentTypeRef',
      catalogIdentifier: 'InvestmentType',
      parentSelectId: 'investmentGroup',
      labelKey: 'investment-type-label'
    }
  ]
})

const createDefaultLabels = (group: InvestmentImportGroupDescriptor): InvestmentImportViewLabels => ({
  dataTestIdPrefix: `${group.tabId}-investment-import-view`
})

/**
 * Build the final `ImportConfig` for a group by layering an override patch
 * on top of the default. `enforcedSelects` and `payloadExtensions` merge
 * additively (defaults first, then override-specific entries) so groups
 * never have to re-declare the `investmentType` select.
 */
const mergeImportConfig = (
  base: ImportConfig,
  override: InvestmentGroupImportOverridePatch | undefined
): ImportConfig => {
  if (!override) return base
  return {
    ...base,
    ...override,
    enforcedSelects: [...(base.enforcedSelects ?? []), ...(override.enforcedSelects ?? [])],
    payloadExtensions: [...(base.payloadExtensions ?? []), ...(override.payloadExtensions ?? [])]
  }
}

export const getGroupImportConfiguration = (
  group: InvestmentImportGroupDescriptor
): InvestmentGroupImportDefinition => {
  const override = GROUP_IMPORT_CONFIGURATIONS[group.code]
  return {
    group,
    importConfig: mergeImportConfig(createDefaultImportConfig(group), override?.importConfig),
    labels: {
      ...createDefaultLabels(group),
      ...override?.labels
    }
  }
}
