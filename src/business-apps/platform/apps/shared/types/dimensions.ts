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
