import { CUSTOM_FLOW_ENGINE_API_URL } from './serviceResolver'

export type DiscoveredEntityKind = 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'

export interface DiscoveredEntityOption {
  type: string
  name: string
  fields: string[]
  kind: DiscoveredEntityKind
  namespace?: string
  description?: string
}

interface InternalEntityField {
  name?: string
  field?: string
}

interface InternalEntitySchemaResponseItem {
  type?: string
  entity?: string
  entityType?: string
  name?: string
  displayName?: string
  description?: string
  fields?: Array<InternalEntityField | string>
}

interface CustomDataNamespaceResponseItem {
  namespace?: string
}

interface CustomEntityColumn {
  fieldName?: string
}

interface CustomEntityDefinitionResponseItem {
  namespace?: string
  entityName?: string
  displayName?: string
  kind?: string
  publishState?: string
  description?: string
  columns?: CustomEntityColumn[]
}

const sortByReadableName = (left: DiscoveredEntityOption, right: DiscoveredEntityOption) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })

const toFieldNames = (rawFields: Array<InternalEntityField | string> | undefined): string[] =>
  (rawFields ?? [])
    .map(field => (typeof field === 'string' ? field : field.name || field.field || ''))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))

const buildHeaders = (accessToken?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
})

/** CFE returns a paged `{ data, paging, _links }` object; older callers expected a raw array. */
function normalizeNamespaceList(payload: unknown): CustomDataNamespaceResponseItem[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: CustomDataNamespaceResponseItem[] }).data
  }
  return []
}

function normalizeInternalEntityList(payload: unknown): InternalEntitySchemaResponseItem[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: InternalEntitySchemaResponseItem[] }).data
  }
  return []
}

export async function fetchInternalEntityOptions(params: {
  accessToken?: string
  includeFields?: boolean
}): Promise<DiscoveredEntityOption[]> {
  const { accessToken, includeFields = true } = params
  const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/v1/custom-data/internal-entities`, {
    method: 'GET',
    headers: buildHeaders(accessToken)
  })

  if (!response.ok) {
    console.warn(`Internal entities unavailable: ${response.status} ${response.statusText}`)
    return []
  }

  const payload = normalizeInternalEntityList(await response.json())
  return payload
    .map(entity => ({
      type: String(entity.type || entity.entity || entity.entityType || '').trim(),
      name: String(entity.displayName || entity.name || entity.type || entity.entity || '').trim(),
      fields: includeFields ? toFieldNames(entity.fields) : [],
      kind: 'INTERNAL_ENTITY' as const,
      description: entity.description
    }))
    .filter(entity => entity.type)
    .sort(sortByReadableName)
}

export async function fetchCustomEntityOptions(accessToken: string): Promise<DiscoveredEntityOption[]> {
  if (!accessToken) {
    return []
  }

  const namespacesResponse = await fetch(
    `${CUSTOM_FLOW_ENGINE_API_URL}/v1/custom-data/namespaces?limit=500&offset=0&returnTotalRecords=false`,
    {
      method: 'GET',
      headers: buildHeaders(accessToken)
    }
  )

  if (!namespacesResponse.ok) {
    console.warn(`Custom data namespaces unavailable: ${namespacesResponse.status} ${namespacesResponse.statusText}`)
    return []
  }

  const namespaces = normalizeNamespaceList(await namespacesResponse.json())
  const definitionsByNamespace = await Promise.all(
    namespaces.map(async namespaceItem => {
      const namespace = String(namespaceItem.namespace || '').trim()
      if (!namespace) {
        return []
      }

      const response = await fetch(
        `${CUSTOM_FLOW_ENGINE_API_URL}/v1/custom-data/namespaces/${encodeURIComponent(namespace)}/custom-entities`,
        {
          method: 'GET',
          headers: buildHeaders(accessToken)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to load custom entities: ${response.status} ${response.statusText}`)
      }

      return response.json() as Promise<CustomEntityDefinitionResponseItem[]>
    })
  )

  const definitions = definitionsByNamespace
    .flat()
    .filter(
      definition =>
        definition.kind === 'CUSTOM_ENTITY' && definition.publishState === 'PROMOTED_TRACKED' && definition.entityName
    )
  const duplicateKeyCounts = definitions.reduce<Record<string, number>>((accumulator, definition) => {
    const key = String(definition.entityName || '').trim()
    if (key) {
      accumulator[key] = (accumulator[key] || 0) + 1
    }
    return accumulator
  }, {})

  return definitions
    .map(definition => ({
      type: String(definition.entityName || '').trim(),
      name:
        duplicateKeyCounts[String(definition.entityName || '').trim()] > 1
          ? `${String(definition.displayName || definition.entityName || '').trim()} (${String(definition.namespace || 'default').trim() || 'default'})`
          : String(definition.displayName || definition.entityName || '').trim(),
      fields: (definition.columns ?? [])
        .map(column => String(column.fieldName || '').trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
      kind: 'CUSTOM_ENTITY' as const,
      namespace: String(definition.namespace || 'default').trim() || 'default',
      description: definition.description
    }))
    .sort(sortByReadableName)
}
