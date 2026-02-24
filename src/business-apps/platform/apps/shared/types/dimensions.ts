/**
 * Shared dimension types for organizational group selection
 * Used by both chat (group chats) and spaces (dimension-based spaces)
 */

export type DimensionType = 'organization_unit' | 'matrix_team' | 'location' | 'legal_entity' | 'capability'

export interface DimensionOption {
  id: string
  name: string
  type?: string // For org units (DEPARTMENT, TEAM, etc.)
}

export interface DimensionWithMembers extends DimensionOption {
  memberCount?: number
}

/**
 * Selected dimension info for storage
 */
export interface SelectedDimension {
  type: DimensionType
  id: string
  name: string
}

/**
 * Translation keys used by DimensionPicker
 */
export interface DimensionPickerTranslations {
  selectTypePrompt: string
  selectFrom: string
  searchPlaceholder: string
  noResults: string
  noDimensionsAvailable: string
  membersToAdd: string
  noMembersFound: string
  cannotCreateEmpty: string
  stepSelectType: string
  stepSelectGroup: string
  stepConfirm: string
  cancel: string
  back: string
  continue: string
  available: string
  // Dimension type labels
  organizationUnit: string
  matrixTeam: string
  location: string
  legalEntity: string
  capability: string
}

/**
 * Translation function signature for shared dimension UI helpers.
 */
export type DimensionTranslateFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * Default English translations for DimensionPicker
 */
export const DEFAULT_DIMENSION_TRANSLATIONS: DimensionPickerTranslations = {
  selectTypePrompt: 'Select a group type to create your space from',
  selectFrom: 'Select from',
  searchPlaceholder: 'Search...',
  noResults: 'No results found',
  noDimensionsAvailable: 'No dimensions available',
  membersToAdd: 'Members to add',
  noMembersFound: 'No members found',
  cannotCreateEmpty: 'Cannot create with no members',
  stepSelectType: '1. Type',
  stepSelectGroup: '2. Group',
  stepConfirm: '3. Confirm',
  cancel: 'Cancel',
  back: 'Back',
  continue: 'Continue',
  available: 'available',
  organizationUnit: 'Organization Unit',
  matrixTeam: 'Matrix Team',
  location: 'Location',
  legalEntity: 'Legal Entity',
  capability: 'Capability'
}

/**
 * Build DimensionPicker translations from i18n keys used in shared/_i18n/*.ftl.
 * Falls back to DEFAULT_DIMENSION_TRANSLATIONS when a key is missing.
 */
export const getDimensionPickerTranslations = (t: DimensionTranslateFn): DimensionPickerTranslations => ({
  selectTypePrompt: t('dimension-select-type-prompt') || DEFAULT_DIMENSION_TRANSLATIONS.selectTypePrompt,
  selectFrom: t('dimension-select-from') || DEFAULT_DIMENSION_TRANSLATIONS.selectFrom,
  searchPlaceholder: t('dimension-search-placeholder') || DEFAULT_DIMENSION_TRANSLATIONS.searchPlaceholder,
  noResults: t('dimension-no-results') || DEFAULT_DIMENSION_TRANSLATIONS.noResults,
  noDimensionsAvailable: t('dimension-no-available') || DEFAULT_DIMENSION_TRANSLATIONS.noDimensionsAvailable,
  membersToAdd: t('dimension-members-to-add') || DEFAULT_DIMENSION_TRANSLATIONS.membersToAdd,
  noMembersFound: t('dimension-no-members-found') || DEFAULT_DIMENSION_TRANSLATIONS.noMembersFound,
  cannotCreateEmpty: t('dimension-cannot-create-empty') || DEFAULT_DIMENSION_TRANSLATIONS.cannotCreateEmpty,
  stepSelectType: t('dimension-step-type') || DEFAULT_DIMENSION_TRANSLATIONS.stepSelectType,
  stepSelectGroup: t('dimension-step-group') || DEFAULT_DIMENSION_TRANSLATIONS.stepSelectGroup,
  stepConfirm: t('dimension-step-confirm') || DEFAULT_DIMENSION_TRANSLATIONS.stepConfirm,
  cancel: t('dimension-cancel') || DEFAULT_DIMENSION_TRANSLATIONS.cancel,
  back: t('dimension-back') || DEFAULT_DIMENSION_TRANSLATIONS.back,
  continue: t('dimension-continue') || DEFAULT_DIMENSION_TRANSLATIONS.continue,
  available: t('dimension-available') || DEFAULT_DIMENSION_TRANSLATIONS.available,
  organizationUnit: t('dimension-organization-unit') || DEFAULT_DIMENSION_TRANSLATIONS.organizationUnit,
  matrixTeam: t('dimension-matrix-team') || DEFAULT_DIMENSION_TRANSLATIONS.matrixTeam,
  location: t('dimension-location') || DEFAULT_DIMENSION_TRANSLATIONS.location,
  legalEntity: t('dimension-legal-entity') || DEFAULT_DIMENSION_TRANSLATIONS.legalEntity,
  capability: t('dimension-capability') || DEFAULT_DIMENSION_TRANSLATIONS.capability
})
