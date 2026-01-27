/**
 * Import API Service
 * Handles API calls to backend import endpoints for any entity type
 *
 * ⚠️ TEMPORARY IMPLEMENTATION:
 * Uses direct fetch() instead of RestClient while import endpoints are being developed.
 * This violates the "API Requests" guideline but is a known temporary placeholder.
 *
 * TODO: Refactor to use RestClient pattern once endpoints are stable
 *       See useUpdateLeadStatus.ts for the correct pattern example
 */

import { ConvertedEntity, ImportResult } from '../types'

export class ImportApiService {
  private readonly baseUrl: string
  private readonly accessToken: string

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl
    this.accessToken = accessToken
  }

  /**
   * Generic bulk create entities from converted data
   * @param entityType Type of entity ('lead', 'contact', etc.)
   * @param entities Array of converted entity objects
   * @returns Import result with success/error counts
   */
  async bulkCreateEntities(entityType: string, entities: ConvertedEntity[]): Promise<ImportResult> {
    try {
      const entityTypePlural = `${entityType}s`

      // Map entity type to correct endpoint
      // Only 'lead' endpoint is available, others use placeholder
      let endpoint: string
      if (entityType === 'lead') {
        endpoint = `${this.baseUrl}/customer-relations/createLeads`
      } else {
        // Placeholder for future endpoints (contact, account)
        endpoint = `${this.baseUrl}/api/crm/${entityTypePlural}/bulk-import`
      }

      // TODO: Replace with RestClient.post() - temporary placeholder during endpoint development
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ [entityTypePlural]: entities })
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Transform response based on entity type
      if (entityType === 'lead') {
        // Kogito process response format
        const hasErrors = result.validationResponse?.errors?.length > 0
        const createdLeads = result.leads || []

        return {
          success: !hasErrors && createdLeads.length > 0,
          successCount: createdLeads.length,
          errorCount: hasErrors ? result.validationResponse.errors.length : 0,
          errors: hasErrors
            ? result.validationResponse.errors.map((err: any, idx: number) => ({
                rowIndex: idx,
                entityData: {},
                error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
              }))
            : [],
          createdIds: createdLeads.map((lead: any) => lead.id)
        }
      } else {
        // Generic response format (for future endpoints)
        return {
          success: true,
          successCount: result.successCount || entities.length,
          errorCount: result.errorCount || 0,
          errors: result.errors || [],
          createdIds: result.createdIds || []
        }
      }
    } catch (error) {
      console.error(`Bulk create ${entityType}s failed:`, error)
      return {
        success: false,
        successCount: 0,
        errorCount: entities.length,
        errors: [
          {
            rowIndex: 0,
            entityData: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        ]
      }
    }
  }

  /**
   * Bulk create leads from converted data
   * @deprecated Use bulkCreateEntities('lead', leads) instead
   * @param leads Array of converted lead objects
   * @returns Import result with success/error counts
   */
  async bulkCreateLeads(leads: ConvertedEntity[]): Promise<ImportResult> {
    return this.bulkCreateEntities('lead', leads)
  }

  /**
   * Bulk create contacts from converted data
   * @param contacts Array of converted contact objects
   * @returns Import result with success/error counts
   */
  async bulkCreateContacts(contacts: ConvertedEntity[]): Promise<ImportResult> {
    return this.bulkCreateEntities('contact', contacts)
  }

  /**
   * Validate import data before submission
   * @param entities Array of entities to validate
   * @param requiredFields Optional array of field names that are required
   * @returns Validation result
   */
  async validateImportData(
    entities: ConvertedEntity[],
    requiredFields?: string[]
  ): Promise<{
    valid: boolean
    errors: string[]
  }> {
    // Basic client-side validation
    const errors: string[] = []

    if (entities.length === 0) {
      errors.push('No data to import')
    }

    if (entities.length > 10000) {
      errors.push('Maximum 10,000 records per import')
    }

    // Check for required fields if specified
    if (requiredFields && requiredFields.length > 0) {
      entities.forEach((entity, index) => {
        const hasAnyRequiredField = requiredFields.some(field => {
          const value = entity[field]
          return value !== null && value !== undefined && value !== ''
        })

        if (!hasAnyRequiredField) {
          errors.push(
            `Row ${index + 1}: At least one of the following fields is required: ${requiredFields.join(', ')}`
          )
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
