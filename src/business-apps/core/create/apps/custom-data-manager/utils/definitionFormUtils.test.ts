import { InputType, type ColumnDefinition } from '../types'
import {
  buildUniqueDefinitionKey,
  deriveDefinitionKeyFromDisplayName,
  getPersistedReferenceFieldNamePreview,
  prepareColumnsForPersistence,
  prepareColumnsForEditing,
  syncColumnNameWithLabel,
  validateDefinitionForm
} from './definitionFormUtils'

function createReferenceColumn(name: string): ColumnDefinition {
  return {
    type: InputType.SELECT,
    name,
    label: 'Company',
    dataSource: { type: 'CUSTOM_ENTITY', entity: 'company' }
  }
}

describe('definitionFormUtils', () => {
  it('derives entity keys from display names', () => {
    expect(deriveDefinitionKeyFromDisplayName('Waterfall')).toBe('waterfall')
    expect(deriveDefinitionKeyFromDisplayName(' Water Report ')).toBe('water_report')
  })

  it('adds numeric suffixes when a derived key already exists', () => {
    expect(buildUniqueDefinitionKey('New Entity', ['new_entity'])).toBe('new_entity_2')
    expect(buildUniqueDefinitionKey('New Entity', ['new_entity', 'new_entity_2'])).toBe('new_entity_3')
  })

  it('derives entity reference field names from labels in snake_case', () => {
    const normalizedColumn = syncColumnNameWithLabel({
      ...createReferenceColumn('company'),
      label: 'Company Name'
    })

    expect(normalizedColumn.name).toBe('company_name')
  })

  it('rejects camelCase entity reference field names', () => {
    const validationError = validateDefinitionForm({
      displayName: 'Jobs',
      columns: [createReferenceColumn('companyId')]
    })

    expect(validationError).toContain("Use 'company' instead")
  })

  it('keeps natural words ending in id valid for entity reference field names', () => {
    const validationError = validateDefinitionForm({
      displayName: 'Vehicles',
      columns: [createReferenceColumn('hybrid')]
    })

    expect(validationError).toBeNull()
    expect(getPersistedReferenceFieldNamePreview(createReferenceColumn('hybrid'))).toBe('hybrid_id')
  })

  it('shows persisted foreign key names as editable relationship names', () => {
    const editableColumns = prepareColumnsForEditing([createReferenceColumn('company_id')])

    expect(editableColumns[0].name).toBe('company')
  })

  it('prepares entity reference field names for persistence', () => {
    const persistedColumns = prepareColumnsForPersistence([createReferenceColumn('company')])

    expect(persistedColumns[0].name).toBe('company_id')
  })
})
