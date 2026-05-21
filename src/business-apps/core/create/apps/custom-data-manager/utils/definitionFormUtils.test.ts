import { InputType, type ColumnDefinition } from '../types'
import {
  getEditableReferenceFieldName,
  getDuplicateDefinitionDisplayNameError,
  normalizeEntityDisplayNameKey,
  getPersistedReferenceFieldNamePreview,
  prepareColumnsForPersistence,
  prepareColumnsForEditing,
  syncColumnNameWithLabel,
  validateDefinitionForm
} from './definitionFormUtils'

function createReferenceColumn(name: string): ColumnDefinition {
  return {
    type: InputType.SELECT,
    fieldName: name,
    label: 'Company',
    dataSource: { type: 'CUSTOM_ENTITY', entity: 'Company' }
  }
}

describe('definitionFormUtils', () => {
  it('normalizes display names for duplicate checks', () => {
    expect(normalizeEntityDisplayNameKey('Asset Location')).toBe('assetlocation')
    expect(normalizeEntityDisplayNameKey('AssetLocation')).toBe('assetlocation')
    expect(normalizeEntityDisplayNameKey('asset location')).toBe('assetlocation')
    expect(normalizeEntityDisplayNameKey('assET LOCation')).toBe('assetlocation')
  })

  it('detects duplicate display names after entity name normalization', () => {
    const duplicateError = getDuplicateDefinitionDisplayNameError({
      displayName: 'AssetLocation',
      namespace: 'com.example',
      definitions: [
        {
          id: 'asset-location',
          namespace: 'com.example',
          entityName: 'AssetLocation',
          displayName: 'Asset Location'
        }
      ]
    })

    expect(duplicateError).toContain('Asset Location')
  })

  it('ignores the current definition when checking duplicate display names', () => {
    const duplicateError = getDuplicateDefinitionDisplayNameError({
      displayName: 'AssetLocation',
      namespace: 'com.example',
      currentDefinitionId: 'asset-location',
      definitions: [
        {
          id: 'asset-location',
          namespace: 'com.example',
          entityName: 'AssetLocation',
          displayName: 'Asset Location'
        }
      ]
    })

    expect(duplicateError).toBeNull()
  })

  it('derives entity reference field names from labels in camelCase', () => {
    const normalizedColumn = syncColumnNameWithLabel({
      ...createReferenceColumn(''),
      label: 'Company Name'
    })

    expect(normalizedColumn.fieldName).toBe('companyName')
  })

  it('accepts explicit reference field names with id suffixes', () => {
    const validationError = validateDefinitionForm({
      displayName: 'Jobs',
      columns: [{ ...createReferenceColumn('companyId'), label: 'CompanyId' }]
    })

    expect(validationError).toBeNull()
  })

  it('keeps natural words ending in id valid for entity reference field names', () => {
    const validationError = validateDefinitionForm({
      displayName: 'Vehicles',
      columns: [createReferenceColumn('hybrid')]
    })

    expect(validationError).toBeNull()
    expect(getPersistedReferenceFieldNamePreview(createReferenceColumn('hybrid'))).toBe('hybrid')
  })

  it('shows persisted foreign key fields as editable relationship names', () => {
    const editableColumns = prepareColumnsForEditing([createReferenceColumn('companyId')])

    expect(getEditableReferenceFieldName(editableColumns[0])).toBe('companyId')
  })

  it('prepares entity reference field names for persistence', () => {
    const persistedColumns = prepareColumnsForPersistence([createReferenceColumn('company')])

    expect(persistedColumns[0].fieldName).toBe('company')
  })
})
