import { FieldGroup, FieldDefinition } from '../types'
import { generateGroupId, generateFieldId } from './idGenerationUtils'

/**
 * Creates a default group object
 */
export const createDefaultGroup = (): FieldGroup => {
  return {
    groupId: generateGroupId(),
    groupLabel: 'Default',
    displayOrder: 1,
    fields: []
  }
}

/**
 * Creates a default field object with the given display order
 */
export const createDefaultField = (displayOrder: string): FieldDefinition => {
  return {
    id: generateFieldId(),
    type: 'TEXT',
    label: 'New Field',
    property: 'investment.newField',
    required: false,
    displayOrder
  }
}
