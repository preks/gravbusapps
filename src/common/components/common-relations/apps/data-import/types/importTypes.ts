/**
 * Shared types for import functionality across all entities
 */

export type { CsvQuality } from '@/common/network/flowbot/FlowbotClient'

// Field mapping between source CSV and target entity
export interface FieldMapping {
  sourceField: string
  targetField: string
  transformationType: 'direct' | 'catalog'
  catalogIdentifier?: string
}

// AI analyzer response structure
export interface ImportAnalyzerResponse {
  fieldMappings: FieldMapping[]
  sourceFields: string[]
  unmappedSourceFields: string[]
  totalRowsRead?: number
}

// Communication channel structure for contacts/accounts
export interface CommunicationChannel {
  communicationChannelRef: string
  value: string
  valueExtension?: string
}

// Generic converted entity (can have any fields)
// NOTE: Supports arrays (e.g., communicationChannels) and objects for complex field transformations
export interface ConvertedEntity {
  [key: string]: string | boolean | number | null | undefined | CommunicationChannel[] | Record<string, unknown>
  communicationChannels?: CommunicationChannel[]
}

/**
 * Declarative description of a catalog-backed select whose value is
 * enforced across every imported row. Rendered through `CatalogSelect`
 * on the upload step and injected into the extraction step so Flowbot
 * fills every row with the chosen value.
 *
 * Parent/child filtering is form-driven: `parentSelectId` points at
 * another enforced-select's `id`, and the form value of that parent is
 * passed to `CatalogSelect.parentField`. Static parents (e.g. the
 * `InvestmentGroup` an import view is scoped to) are modeled by adding
 * a `hidden` enforced-select pre-seeded via `defaultParentEntryRef`.
 *
 * Adding a new enforced select is a config-only change.
 */
export interface EnforcedSelectConfig {
  /** Stable id; doubles as the react-hook-form field name for this select. */
  id: string
  /**
   * Dotted UI target field that Flowbot injects into every extracted row.
   * Hidden synthetic configs (used only as a parent source) leave this
   * empty.
   */
  targetField: string
  /** Catalog identifier without version suffix, e.g. 'InvestmentType'. */
  catalogIdentifier: string
  /**
   * Form-field id of another enforced-select that supplies the
   * `parentEntryId` for catalog filtering. The value is read live from
   * the form, so cascading clears propagate automatically.
   */
  parentSelectId?: string
  /**
   * Static catalog-entry ref used to seed the form value at mount. Only
   * meaningful on hidden synthetic configs that act as the chain root.
   */
  defaultParentEntryRef?: string
  /**
   * When true, this select is registered into the form for cascading and
   * its value is consumed by other selects, but no UI is rendered.
   */
  hidden?: boolean
  /** When true, the Analyze button is disabled until the user picks a value. */
  required?: boolean
  /** Optional fallback applied at submit time if the value is still missing. */
  defaultValueRef?: string
  /** i18n key for the label. */
  labelKey: string
}

/**
 * Hook that runs against a single investment request inside
 * `toInvestmentBatchPayload`, after flat keys have been re-nested but before
 * the final request object is returned. Intended for group-specific value
 * coercions (e.g. parsing a JSON string into an object) that structural
 * re-nesting can't express.
 */
export type InvestmentPayloadExtension = (context: {
  investment: Record<string, any>
  specific: Record<string, any>
  payloadKey: string
}) => void

// Import configuration for an entity
export interface ImportConfig {
  entityType: string
  domain: 'customer' | 'investment' // Domain for endpoint routing
  targetFields: TargetFieldDefinition[]
  investmentPayloadKey?: string
  /**
   * Fallback `InvestmentGroup` code (e.g. 'EQUITY') used by
   * `submitIrmImport` only when `investmentGroupRef` is not pre-resolved.
   * The standard registry path always sets `investmentGroupRef`, so this
   * exists for hand-built `ImportConfig`s.
   */
  investmentGroupCodeHint?: string
  /**
   * Pre-resolved `InvestmentGroup` catalog entry id, e.g.
   * 'InvestmentGroup:v1:LIQUID_FUND'. When present, `submitIrmImport`
   * skips the GraphQL lookup that would otherwise resolve the id from
   * `investmentGroupCodeHint` or the entity-type derivation.
   */
  investmentGroupRef?: string
  /** Optional list of catalog selects enforced across every imported row. */
  enforcedSelects?: EnforcedSelectConfig[]
  /**
   * Optional per-group value extensions applied inside
   * `toInvestmentBatchPayload` (investment-domain only).
   */
  payloadExtensions?: InvestmentPayloadExtension[]
}

// Target field definition
export interface TargetFieldDefinition {
  value: string
  label: string
  type: 'direct' | 'catalog'
  catalog?: string
  required?: boolean
}

// Import result after API call
export interface ImportResult {
  success: boolean
  successCount: number
  errorCount: number
  errors?: ImportError[]
  createdIds?: string[]
}

// Import error details
export interface ImportError {
  rowIndex: number
  entityData: ConvertedEntity
  error: string
}

// Import step types
export type ImportStep = 'upload' | 'mapping' | 'result'
