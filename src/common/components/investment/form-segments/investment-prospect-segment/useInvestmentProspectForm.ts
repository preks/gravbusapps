import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { z } from 'zod'
import { FormFieldsDefinition } from './useInvestmentProspectFields'
import { buildInvestmentProspectSchema } from './investmentProspectSchema'

interface UseInvestmentProspectFormOptions {
  /** Base schema (e.g. investmentLeadSchema, investmentOpportunitySchema) */
  baseSchema: z.ZodObject<any>
  /** Form fields definition from prospect fields hook */
  formFieldsDefinition?: FormFieldsDefinition
  /** Entity data (lead, opportunity) - needed to extract dynamic field values */
  entity: any
}

/**
 * Custom hook for managing dynamic prospect field schema
 * ONLY handles Investment Prospect specific logic:
 * - Building schema with dynamic fields
 * - Managing schema state
 * - Extracting dynamic field values from entity
 * - Providing helper to extract dynamic fields from form values
 *
 * This hook is designed to be used alongside the standard form pattern
 * (like CRM LeadForm/OpportunityForm), adding only Investment Prospect functionality
 */
export const useInvestmentProspectForm = ({
  baseSchema,
  formFieldsDefinition,
  entity
}: UseInvestmentProspectFormOptions) => {
  // Schema state - starts with base schema, will be extended with dynamic fields
  const [schema, setSchema] = useState<z.ZodObject<any>>(() => baseSchema)

  // Dynamic schema memoization - builds schema with dynamic prospect fields
  const prospectSchema = useMemo(() => {
    const dynamicFields = buildInvestmentProspectSchema(
      formFieldsDefinition || undefined,
      new Set(Object.keys(baseSchema.shape))
    )

    return Object.keys(dynamicFields).length > 0 ? baseSchema.extend(dynamicFields) : baseSchema
  }, [baseSchema, formFieldsDefinition])

  // Track schema changes
  const previousSchemaKeysRef = useRef<string[]>([])

  // Effect: Update schema state when prospect schema changes
  useEffect(() => {
    const newSchemaKeys = Object.keys(prospectSchema.shape)
    const schemaChanged = JSON.stringify(previousSchemaKeysRef.current) !== JSON.stringify(newSchemaKeys)

    if (schemaChanged) {
      previousSchemaKeysRef.current = newSchemaKeys
      setSchema(prospectSchema)
    }
  }, [prospectSchema])

  /**
   * Extract dynamic prospect field values from entity
   * Used when loading entity data into form
   * Memoized to prevent re-creation on every render
   */
  const extractDynamicFieldValuesFromEntity = useCallback((): Record<string, any> => {
    const dynamicFieldValues: Record<string, any> = {}
    if (formFieldsDefinition?.formFields) {
      for (const group of formFieldsDefinition.formFields) {
        for (const field of group.fields) {
          const property = field.property
          if (property && entity && entity[property] !== undefined) {
            dynamicFieldValues[property] = entity[property]
          }
        }
      }
    }
    return dynamicFieldValues
  }, [formFieldsDefinition, entity])

  /**
   * Update form values when schema changes (only dynamic fields)
   * Keeps all current form values, only updates dynamic fields from entity
   * Memoized to prevent re-creation on every render
   */
  const updateDynamicFieldsInFormValues = useCallback(
    (currentFormValues: Record<string, any>): Record<string, any> => {
      const updatedValues = { ...currentFormValues }

      if (!formFieldsDefinition?.formFields) {
        return updatedValues
      }

      // Get dynamic field properties
      const dynamicFieldProperties = new Set<string>()
      for (const group of formFieldsDefinition.formFields) {
        for (const field of group.fields) {
          dynamicFieldProperties.add(field.property)
        }
      }

      // Update dynamic fields: use value from entity if available, otherwise undefined
      for (const property of dynamicFieldProperties) {
        if (entity && property in entity) {
          updatedValues[property] = entity[property]
        } else {
          // New dynamic field that doesn't exist in entity: set to undefined
          updatedValues[property] = undefined
        }
      }

      return updatedValues
    },
    [formFieldsDefinition, entity]
  )

  /**
   * Extract dynamic prospect field values from form values
   * Used in handleSubmit to merge dynamic fields with entity payload
   * Memoized to prevent re-creation on every render
   */
  const extractProspectFieldsFromFormValues = useCallback(
    (formValues: any): Record<string, any> => {
      const dynamicFields: Record<string, any> = {}

      if (!formFieldsDefinition?.formFields) {
        return dynamicFields
      }

      const firstGroup = formFieldsDefinition.formFields[0]
      const prospectFieldProperties: string[] = firstGroup?.fields?.map((f: { property: string }) => f.property) || []

      for (const prop of prospectFieldProperties) {
        if (formValues[prop] !== undefined) {
          dynamicFields[prop] = formValues[prop]
        }
      }

      return dynamicFields
    },
    [formFieldsDefinition]
  )

  return {
    /** Current schema (with dynamic fields if available) - use this in AppActionForm */
    schema,
    /** Prospect schema with dynamic fields (memoized) - use this for mapToFormValues */
    prospectSchema,
    /** Extract dynamic field values from entity - use when loading entity into form */
    extractDynamicFieldValuesFromEntity,
    /** Update only dynamic fields in form values when schema changes */
    updateDynamicFieldsInFormValues,
    /** Extract dynamic prospect fields from form values - use in handleSubmit */
    extractProspectFieldsFromFormValues
  }
}
