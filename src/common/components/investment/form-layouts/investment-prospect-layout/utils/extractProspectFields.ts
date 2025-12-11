import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

/**
 * Extract dynamic prospect field values from form values
 * Used in handleSubmit to merge dynamic fields with entity payload
 * Based on DynamicFormConfiguration (referenceFields)
 */
export const extractProspectFieldsFromFormValues = (
  formValues: any,
  formFieldsDefinition?: DynamicFormConfiguration | null
): Record<string, any> => {
  const dynamicFields: Record<string, any> = {}

  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return dynamicFields
  }

  // Extract all field properties from all groups
  const prospectFieldProperties: string[] = []
  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      if (field.property) {
        prospectFieldProperties.push(field.property)
      }
    }
  }

  // Extract values from form values
  for (const prop of prospectFieldProperties) {
    if (formValues[prop] !== undefined) {
      dynamicFields[prop] = formValues[prop]
    }
  }

  return dynamicFields
}

/**
 * Extract dynamic prospect field values from entity
 * Used when loading entity data into form
 */
export const extractProspectFieldsFromEntity = (
  entity: any,
  formFieldsDefinition?: DynamicFormConfiguration | null
): Record<string, any> => {
  const dynamicFieldValues: Record<string, any> = {}

  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return dynamicFieldValues
  }

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const property = field.property
      if (property && entity?.[property] !== undefined) {
        dynamicFieldValues[property] = entity[property]
      }
    }
  }

  return dynamicFieldValues
}
