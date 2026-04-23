/**
 * Curated registry of pickable investment form fields for IRM Investment Data settings.
 * Paths and catalog types align with dynamic investment forms and import configs.
 */
import type { FieldDefinition, FieldGroup, RequiredSubtypeKey } from '../types'
import { COMMON_INVESTMENT_FIELDS } from '@/business-apps/irm/core/apps/data-import/config/commonInvestmentFields'
import { EQUITY_SPECIFIC_FIELDS } from '@/business-apps/irm/core/apps/data-import/config/overrides/equityInvestmentImportOverride'
import { REAL_ESTATE_SPECIFIC_FIELDS } from '@/business-apps/irm/core/apps/data-import/config/overrides/realEstateInvestmentImportOverride'
import { LIQUID_FUND_BASE_FIELDS } from '@/business-apps/irm/core/apps/data-import/config/overrides/liquidFundInvestmentImportOverride'
import type { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'
import { generateFieldId } from './idGenerationUtils'

export type InvestmentFieldRegistrySection =
  | 'investment'
  | 'equityInvestment'
  | 'realEstateInvestment'
  | 'liquidFundInvestment'

export interface InvestmentFormFieldRegistryEntry {
  /** Stable id stored on FieldDefinition.registryEntryId (stripped before catalog save). */
  id: string
  property: string
  label: string
  type: string
  section: InvestmentFieldRegistrySection
  report?: boolean
}

const OMIT_FROM_COMMON = new Set([
  'investment.investmentGroupRef',
  'investment.investmentAccountId',
  'investment.investmentAccounts',
  'investment.investmentRole'
])

function slugFromProperty(property: string): string {
  return property.replace(/\./g, '-')
}

function mapDirectToDynamicType(value: string): string {
  const leaf = (value.split('.').pop() || '').toLowerCase()

  if (leaf.endsWith('date') && leaf !== 'updatedat' && leaf !== 'createdat') {
    return 'DATE'
  }
  if (
    leaf.endsWith('amount') ||
    leaf.includes('amount') ||
    leaf.endsWith('rent') ||
    leaf.endsWith('expenses') ||
    leaf === 'funding' ||
    leaf.endsWith('marketvalue') ||
    leaf === 'turnoveramount' ||
    leaf === 'ebitdaamount' ||
    leaf === 'loanamount'
  ) {
    return 'AMOUNT'
  }
  if (
    leaf === 'stakepercentage' ||
    leaf === 'occupancypercent' ||
    leaf === 'loaninterestrate' ||
    leaf === 'interestrate'
  ) {
    return 'PERCENTAGE'
  }
  if (leaf === 'irr' || leaf === 'moic' || leaf === 'numberofunits') {
    return 'NUMBER'
  }
  if (leaf === 'earlyterminationallowed') {
    return 'BOOLEAN'
  }
  if (leaf === 'liquidityforecast' || leaf === 'addressline') {
    return 'TEXTAREA'
  }
  return 'TEXT'
}

function mapTargetFieldToDynamicType(field: TargetFieldDefinition): string {
  if (field.type === 'catalog' && field.catalog) {
    return `CATALOG_${field.catalog}`
  }
  return mapDirectToDynamicType(field.value)
}

function inferSectionFromProperty(property: string): InvestmentFieldRegistrySection {
  if (property.startsWith('equityInvestment.')) return 'equityInvestment'
  if (property.startsWith('realEstateInvestment.')) return 'realEstateInvestment'
  if (property.startsWith('liquidFundInvestment.')) return 'liquidFundInvestment'
  return 'investment'
}

function buildEntriesFromTargets(fields: TargetFieldDefinition[]): InvestmentFormFieldRegistryEntry[] {
  return fields.map(f => ({
    id: `reg-${slugFromProperty(f.value)}`,
    property: f.value,
    label: f.label,
    type: mapTargetFieldToDynamicType(f),
    section: inferSectionFromProperty(f.value)
  }))
}

const COMMON_ENTRIES = buildEntriesFromTargets(COMMON_INVESTMENT_FIELDS.filter(f => !OMIT_FROM_COMMON.has(f.value)))

const EQUITY_ENTRIES = buildEntriesFromTargets(EQUITY_SPECIFIC_FIELDS)
const REAL_ESTATE_ENTRIES = buildEntriesFromTargets(REAL_ESTATE_SPECIFIC_FIELDS)
const LIQUID_FUND_ENTRIES = buildEntriesFromTargets(LIQUID_FUND_BASE_FIELDS)

const ALL_REGISTRY_ENTRIES: InvestmentFormFieldRegistryEntry[] = [
  ...COMMON_ENTRIES,
  ...EQUITY_ENTRIES,
  ...REAL_ESTATE_ENTRIES,
  ...LIQUID_FUND_ENTRIES
]

const UNIQUE_BY_PROPERTY = new Map<string, InvestmentFormFieldRegistryEntry>()
for (const e of ALL_REGISTRY_ENTRIES) {
  if (!UNIQUE_BY_PROPERTY.has(e.property)) {
    UNIQUE_BY_PROPERTY.set(e.property, e)
  }
}

export const INVESTMENT_FORM_FIELD_REGISTRY: InvestmentFormFieldRegistryEntry[] = [...UNIQUE_BY_PROPERTY.values()]

/** Pick list follows persisted `requiredSubtypeKey` (always one of the three subtype tables). */
export function getPickableFieldsForRequiredSubtype(
  requiredSubtypeKey: RequiredSubtypeKey
): InvestmentFormFieldRegistryEntry[] {
  return INVESTMENT_FORM_FIELD_REGISTRY.filter(e => e.section === 'investment' || e.section === requiredSubtypeKey)
}

export function createFieldDefinitionFromRegistryEntry(
  entry: InvestmentFormFieldRegistryEntry,
  displayOrder: string
): FieldDefinition {
  return {
    id: generateFieldId(),
    type: entry.type,
    label: entry.label,
    property: entry.property,
    required: false,
    displayOrder,
    registryEntryId: entry.id,
    report: entry.report
  }
}

export function sanitizeCustomAdditionalPropertyKey(raw: string): string {
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
  const collapsed = trimmed.replace(/_+/g, '_').replace(/^_|_$/g, '')
  return collapsed.slice(0, 64) || 'custom_field'
}

export function getAdditionalPropertiesParentPrefixForRequiredSubtype(requiredSubtypeKey: RequiredSubtypeKey): string {
  if (requiredSubtypeKey === 'equityInvestment') return 'equityInvestment.additionalProperties'
  if (requiredSubtypeKey === 'realEstateInvestment') return 'realEstateInvestment.additionalProperties'
  return 'liquidFundInvestment.additionalProperties'
}

export function buildCustomFieldProperty(key: string, options: { requiredSubtypeKey: RequiredSubtypeKey }): string {
  const safeKey = sanitizeCustomAdditionalPropertyKey(key)
  const prefix = getAdditionalPropertiesParentPrefixForRequiredSubtype(options.requiredSubtypeKey)
  return `${prefix}.${safeKey}`
}

export function stripRegistryMetadataFromFormFields(fieldGroups: FieldGroup[] | undefined): FieldGroup[] {
  if (!fieldGroups) return []
  return fieldGroups.map(group => ({
    ...group,
    fields: (group.fields || []).map(field => {
      const rest = { ...field }
      delete rest.registryEntryId
      delete rest.isCustom
      return rest
    })
  }))
}
