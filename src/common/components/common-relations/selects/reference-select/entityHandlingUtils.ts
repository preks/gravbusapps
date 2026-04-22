import { UseFormSetValue, UseFormGetValues } from 'react-hook-form'

export interface CommonEntityContext {
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
}

export interface EntityHandlingConfig {
  form: {
    setValue: UseFormSetValue<any>
    getValues: UseFormGetValues<any>
  }
  useIdFields?: boolean // If true, uses accountId/contactId/etc. instead of account/contact/etc.
}

/**
 * Applies initial common entity (account, contact, opportunity, lead) from context to form fields
 * Returns true if a common entity was applied, false otherwise
 *
 * Note: Investment and other non-common entities should be handled separately via onAdditionalEntityChange
 */
export const applyInitialCommonEntityFromContext = (
  initialEntityFromContext: CommonEntityContext | undefined,
  config: EntityHandlingConfig
): boolean => {
  if (!initialEntityFromContext) return false

  const { form, useIdFields = false } = config
  const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext

  // Helper to get field name based on entity type
  const getFieldName = (entityType: 'account' | 'contact' | 'opportunity' | 'lead'): string => {
    return useIdFields ? `${entityType}Id` : entityType
  }

  // Handle standard entity types in priority order
  if (accountId) {
    const fieldName = getFieldName('account')
    const currentValue = form.getValues(fieldName)
    if (currentValue !== accountId) {
      form.setValue(fieldName, accountId)
    }
    // Keep relatedEntityId in sync with context primary (e.g. after form reset with values already set)
    form.setValue('relatedEntityId', accountId)
    return true
  }

  if (contactId) {
    const fieldName = getFieldName('contact')
    const currentValue = form.getValues(fieldName)
    if (currentValue !== contactId) {
      form.setValue(fieldName, contactId)
    }
    form.setValue('relatedEntityId', contactId)
    return true
  }

  if (opportunityId) {
    const fieldName = getFieldName('opportunity')
    const currentValue = form.getValues(fieldName)
    if (currentValue !== opportunityId) {
      form.setValue(fieldName, opportunityId)
    }
    form.setValue('relatedEntityId', opportunityId)
    return true
  }

  if (leadId) {
    const fieldName = getFieldName('lead')
    const currentValue = form.getValues(fieldName)
    if (currentValue !== leadId) {
      form.setValue(fieldName, leadId)
    }
    form.setValue('relatedEntityId', leadId)
    return true
  }

  return false
}

export interface Entity {
  id: string
  type: string
}

/**
 * Helper to clear all standard entity fields
 */
const clearAllStandardEntityFields = (form: EntityHandlingConfig['form'], useIdFields: boolean): void => {
  const clearField = (entityType: 'account' | 'contact' | 'opportunity' | 'lead') => {
    const fieldName = useIdFields ? `${entityType}Id` : entityType
    form.setValue(fieldName, undefined)
  }

  clearField('account')
  clearField('contact')
  clearField('opportunity')
  clearField('lead')
}

/**
 * Helper to clear additional entities via handler
 */
const clearAdditionalEntities = (
  form: EntityHandlingConfig['form'],
  entities: Entity[],
  onAdditionalEntityChange?: (type: string, entityId: string | null) => void
): void => {
  if (!onAdditionalEntityChange) return

  const currentRelatedId = form.getValues('relatedEntityId')
  if (!currentRelatedId) return

  const currentEntity = entities.find(x => x.id === currentRelatedId)
  if (currentEntity && !['account', 'contact', 'opportunity', 'lead'].includes(currentEntity.type)) {
    onAdditionalEntityChange(currentEntity.type, null)
  }
}

/**
 * Helper to handle standard entity types (account, contact, opportunity, lead)
 */
const handleStandardEntity = (entity: Entity, form: EntityHandlingConfig['form'], useIdFields: boolean): void => {
  const fieldName = useIdFields ? `${entity.type}Id` : entity.type
  form.setValue(fieldName, entity.id)
  form.setValue('relatedEntityId', entity.id)
}

/**
 * Helper to handle additional entity types (e.g. investment)
 */
const handleAdditionalEntity = (
  entity: Entity,
  form: EntityHandlingConfig['form'],
  onAdditionalEntityChange?: (type: string, entityId: string | null) => void
): void => {
  if (onAdditionalEntityChange) {
    onAdditionalEntityChange(entity.type, entity.id)
  }
  form.setValue('relatedEntityId', entity.id)
}

/**
 * Creates a handler for EntitySelect onValueChange that properly manages common entity form fields
 * Handles account, contact, opportunity, lead (common entities)
 *
 * Additional entity types (e.g. investment) should be handled via onAdditionalEntityChange callback
 * This keeps common logic separate from domain-specific logic (e.g. IRM investment handling)
 */
export const createCommonEntitySelectHandler = (
  config: EntityHandlingConfig & {
    entities: Entity[]
    onAdditionalEntityChange?: (type: string, entityId: string | null) => void
  }
) => {
  const { form, useIdFields = false, entities, onAdditionalEntityChange } = config

  return (value: string | null) => {
    const id = String(value || '')
    const entity = entities.find(x => x.id === id)

    // Clear all standard entity fields
    clearAllStandardEntityFields(form, useIdFields)

    // Clear additional entities via handler (if provided)
    clearAdditionalEntities(form, entities, onAdditionalEntityChange)

    if (!entity) {
      // Avoid orphan relatedEntityId when the combobox value is not in `entities` (stale list / id mismatch)
      form.setValue('relatedEntityId', '')
      return
    }

    // Handle standard entity types (account, contact, opportunity, lead)
    if (['account', 'contact', 'opportunity', 'lead'].includes(entity.type)) {
      handleStandardEntity(entity, form, useIdFields)
    } else {
      // Handle additional entity types via handler (e.g. investment)
      handleAdditionalEntity(entity, form, onAdditionalEntityChange)
    }
  }
}
