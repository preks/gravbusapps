import { RestClient } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type CustomDataFlowMutationResponse = {
  workflowId: string
  success: boolean
  resultData?: Record<string, unknown>
  error?: string
}

export type CustomDataRowCreateParams = {
  definitionKey: string
  values: Record<string, unknown>
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

export type CustomDataRowUpdateParams = {
  definitionKey: string
  rowId: string
  values: Record<string, unknown>
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

export type CustomDataRowDeleteParams = {
  definitionKey: string
  rowId: string
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

/**
 * Normalize field names to camelCase.
 * Handles: snake_case, PascalCase, kebab-case, "Spaces", UPPER_CASE → camelCase
 *
 * This is a defensive layer: backend should already enforce camelCase, but
 * AI-generated screen code may still use wrong casing. This prevents runtime failures.
 */
function normalizeValueKeys(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(values)) {
    const normalized = normalizeValueKey(key)

    if (normalized !== key && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[CustomDataMutationClient] Field key "${key}" was automatically normalized to "${normalized}". ` +
          'AI-generated code should use camelCase field names to match entity schema. ' +
          'This normalization prevents runtime errors but indicates the screen code needs correction.'
      )
    }

    result[normalized] = val
  }

  return result
}

function normalizeValueKey(key: string): string {
  const parts = key.split(/[_\-\s]+/)
  return parts
    .map((part, index) => {
      const cleaned = part.replace(/[^a-zA-Z0-9]/g, '')
      if (!cleaned) return ''
      if (index === 0) {
        return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    })
    .join('')
}

export class CustomDataMutationClient extends RestClient {
  private namespace?: string

  constructor(params?: { accessToken?: string; namespace?: string }) {
    super(getFlowEngineApiBaseUrl())
    this.namespace = params?.namespace
    if (params?.accessToken) {
      this.setAccessToken(params.accessToken)
    }
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  setNamespace(namespace?: string) {
    const ns = String(namespace || '').trim()
    this.namespace = ns || undefined
  }

  withNamespace(namespace: string): CustomDataMutationClient {
    const client = new CustomDataMutationClient()
    client.headers = { ...this.headers }
    client.setNamespace(namespace)
    return client
  }

  async createRow(params: CustomDataRowCreateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    const normalizedValues = normalizeValueKeys(params.values)

    try {
      return await this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-create', {
        namespace,
        definitionKey: params.definitionKey,
        values: normalizedValues,
        initiator: params.initiator,
        timeoutMs: params.timeoutMs
      })
    } catch (error: any) {
      if (this.shouldRetryWithOriginalValues(error, params.values, normalizedValues)) {
        return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-create', {
          namespace,
          definitionKey: params.definitionKey,
          values: params.values,
          initiator: params.initiator,
          timeoutMs: params.timeoutMs
        })
      }
      // Enhance "Unknown column" errors with field name suggestions
      if (error?.message?.includes('Unknown column')) {
        const enhancedMessage = this.enhanceUnknownColumnError(error.message, params.values, params.definitionKey)
        throw new Error(enhancedMessage)
      }
      throw error
    }
  }

  async updateRow(params: CustomDataRowUpdateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    const normalizedValues = normalizeValueKeys(params.values)

    try {
      return await this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-update', {
        namespace,
        definitionKey: params.definitionKey,
        rowId: params.rowId,
        values: normalizedValues,
        initiator: params.initiator,
        timeoutMs: params.timeoutMs
      })
    } catch (error: any) {
      if (this.shouldRetryWithOriginalValues(error, params.values, normalizedValues)) {
        return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-update', {
          namespace,
          definitionKey: params.definitionKey,
          rowId: params.rowId,
          values: params.values,
          initiator: params.initiator,
          timeoutMs: params.timeoutMs
        })
      }
      // Enhance "Unknown column" errors with field name suggestions
      if (error?.message?.includes('Unknown column')) {
        const enhancedMessage = this.enhanceUnknownColumnError(error.message, params.values, params.definitionKey)
        throw new Error(enhancedMessage)
      }
      throw error
    }
  }

  private enhanceUnknownColumnError(originalError: string, values: Record<string, unknown>, entityKey: string): string {
    const providedFields = Object.keys(values).join(', ')

    return (
      `${originalError}\n\n` +
      `Provided fields: ${providedFields}\n` +
      `This usually means the screen code uses field names that don't match the entity schema.\n` +
      `The entity "${entityKey}" expects camelCase field names. Field names have been auto-normalized, ` +
      `but the entity schema may not have these fields.\n` +
      `Check the data model definition to see the actual field names.`
    )
  }

  private shouldRetryWithOriginalValues(
    error: any,
    originalValues: Record<string, unknown>,
    normalizedValues: Record<string, unknown>
  ): boolean {
    if (!error?.message?.includes('Unknown column')) return false
    const originalKeys = Object.keys(originalValues)
    const normalizedKeys = Object.keys(normalizedValues)
    if (originalKeys.length !== normalizedKeys.length) return true
    return originalKeys.some(key => normalizeValueKey(key) !== key)
  }

  async deleteRow(params: CustomDataRowDeleteParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-delete', {
      namespace,
      definitionKey: params.definitionKey,
      rowId: params.rowId,
      initiator: params.initiator,
      timeoutMs: params.timeoutMs
    })
  }
}
