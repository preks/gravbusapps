/**
 * useTemplateEntityFields
 *
 * Fetches mappable fields for a template entity from GraphQL introspection.
 * Uses the registry's graphqlTypeName (e.g. JobCandidate) to introspect
 * __type(name) and optionally nested object fields (e.g. address.locality).
 * No fallback – fields come from GraphQL only.
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTemplateEntity } from '../entities'

export interface TemplateEntityFieldFromGraphQL {
  key: string
  displayName: string
}

/** Catalog reference: one entity field that points to a catalog (e.g. academicTitle) with a few display sub-fields */
export interface TemplateCatalogGroup {
  fieldKey: string
  displayName: string
  subFields: TemplateEntityFieldFromGraphQL[]
}

export interface UseTemplateEntityFieldsResult {
  /** Direct scalars + non-catalog nested object fields (e.g. address.locality) */
  directFields: TemplateEntityFieldFromGraphQL[]
  /** Catalog references grouped under "Catalog values" with only display-friendly sub-fields */
  catalogGroups: TemplateCatalogGroup[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const INTROSPECTION_QUERY = `
  query IntrospectType($name: String!) {
    __type(name: $name) {
      name
      kind
      fields {
        name
        type {
          kind
          name
          ofType { kind name }
        }
      }
      enumValues {
        name
      }
    }
  }
`

interface IntrospectionFieldType {
  kind: string
  name: string | null
  ofType: { kind: string; name: string | null } | null
}

interface IntrospectionType {
  name: string | null
  kind?: string
  fields: Array<{ name: string; type: IntrospectionFieldType }> | null
  enumValues?: Array<{ name: string }> | null
}

function humanizeFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s: string) => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim()
}

function isScalarOrEnum(type: IntrospectionFieldType): boolean {
  const k = type?.ofType?.kind ?? type?.kind
  return k === 'SCALAR' || k === 'ENUM'
}

function isObjectType(type: IntrospectionFieldType): boolean {
  const k = type?.ofType?.kind ?? type?.kind
  return k === 'OBJECT'
}

/** Sub-fields we expose for catalog refs (avoid dumping full catalog entry internals) */
const CATALOG_DISPLAY_FIELDS = new Set(['id', 'code', 'displayName', 'name', 'description', 'value'])

/**
 * Catalog/reference fields shown under "Catalog values" with sub-fields (displayName, code, etc.).
 * At document generation time the backend resolves the ref and substitutes the chosen sub-field
 * (e.g. {{company_address.countryRef.displayName}} → resolved country name).
 */
const ALLOWED_CATALOG_FIELD_KEYS = new Set(['contractType', 'employmentType', 'countryRef', 'country'])

/** Entity keys that are catalog-like: show displayName/code when introspection returns no type or no fields */
const CATALOG_ENTITY_KEYS = new Set(['contract_type', 'employment_type'])

/** Exclude catalog ref ID fields from direct list (e.g. academicTitleRef, genderRef) – keep table fields only */
function isRefIdField(fieldName: string): boolean {
  return fieldName.endsWith('Ref') || fieldName.endsWith('RefId')
}

function looksLikeCatalogType(typeName: string | null, fieldNames: string[]): boolean {
  if (!typeName) return false
  const name = typeName.toLowerCase()
  if (name.includes('catalog') || name.endsWith('ref')) return true
  const hasCode = fieldNames.includes('code')
  const hasDisplay = fieldNames.includes('displayName') || fieldNames.includes('name')
  return hasCode && hasDisplay
}

function filterCatalogSubFields(parentKey: string, nestedType: IntrospectionType): TemplateEntityFieldFromGraphQL[] {
  if (!nestedType.fields) return []
  const result: TemplateEntityFieldFromGraphQL[] = []
  for (const sub of nestedType.fields) {
    if (!isScalarOrEnum(sub.type)) continue
    if (!CATALOG_DISPLAY_FIELDS.has(sub.name)) continue
    result.push({
      key: `${parentKey}.${sub.name}`,
      displayName: humanizeFieldName(sub.name)
    })
  }
  return result
}

const CATALOG_PLACEHOLDER_FIELDS: TemplateEntityFieldFromGraphQL[] = [
  { key: 'value', displayName: 'Value' },
  { key: 'displayName', displayName: 'Display name' },
  { key: 'code', displayName: 'Code' }
]

function getFallbackForMissingType(entityKey: string): {
  direct: TemplateEntityFieldFromGraphQL[]
  catalogs: TemplateCatalogGroup[]
} {
  const direct: TemplateEntityFieldFromGraphQL[] = []
  if (CATALOG_ENTITY_KEYS.has(entityKey)) {
    direct.push(...CATALOG_PLACEHOLDER_FIELDS)
  }
  return { direct, catalogs: [] }
}

function getEnumFallback(): { direct: TemplateEntityFieldFromGraphQL[]; catalogs: TemplateCatalogGroup[] } {
  return { direct: [...CATALOG_PLACEHOLDER_FIELDS], catalogs: [] }
}

function getNoFieldsFallback(entityKey: string): {
  direct: TemplateEntityFieldFromGraphQL[]
  catalogs: TemplateCatalogGroup[]
} {
  return getFallbackForMissingType(entityKey)
}

async function processTypeFields(
  type: IntrospectionType,
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<{ direct: TemplateEntityFieldFromGraphQL[]; catalogs: TemplateCatalogGroup[] }> {
  const direct: TemplateEntityFieldFromGraphQL[] = []
  const catalogs: TemplateCatalogGroup[] = []
  if (!type.fields?.length) return { direct, catalogs }

  for (const field of type.fields) {
    const typeInfo = field.type
    if (isScalarOrEnum(typeInfo)) {
      if (!isRefIdField(field.name)) {
        direct.push({ key: field.name, displayName: humanizeFieldName(field.name) })
      }
      continue
    }
    if (isObjectType(typeInfo)) {
      const nestedTypeName = typeInfo.ofType?.name ?? typeInfo.name
      if (!nestedTypeName) continue
      try {
        const nestedData = await graphqlClient.request<{ __type: IntrospectionType | null }>(INTROSPECTION_QUERY, {
          name: nestedTypeName
        })
        const nestedType = nestedData?.__type
        if (!nestedType?.fields?.length) continue

        const nestedFieldNames = nestedType.fields.map(f => f.name)
        const isCatalog = looksLikeCatalogType(nestedTypeName, nestedFieldNames)

        if (isCatalog && ALLOWED_CATALOG_FIELD_KEYS.has(field.name)) {
          const subFields = filterCatalogSubFields(field.name, nestedType)
          if (subFields.length > 0) {
            catalogs.push({
              fieldKey: field.name,
              displayName: humanizeFieldName(field.name),
              subFields
            })
          }
        } else if (!isCatalog) {
          for (const sub of nestedType.fields) {
            if (isScalarOrEnum(sub.type)) {
              direct.push({
                key: `${field.name}.${sub.name}`,
                displayName: `${humanizeFieldName(field.name)} → ${humanizeFieldName(sub.name)}`
              })
            }
          }
        }
      } catch {
        // Skip nested type on introspection failure
      }
    }
  }
  return { direct, catalogs }
}

/**
 * Fetches fields for a template entity via GraphQL introspection.
 * Uses entity's graphqlTypeName; flattens one level of nested object fields (e.g. address.locality).
 */
export function useTemplateEntityFields(
  entityKey: string | null,
  accessToken: string | undefined
): UseTemplateEntityFieldsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [directFields, setDirectFields] = useState<TemplateEntityFieldFromGraphQL[]>([])
  const [catalogGroups, setCatalogGroups] = useState<TemplateCatalogGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchFields = useCallback(async () => {
    if (!entityKey || !accessToken) {
      setDirectFields([])
      setCatalogGroups([])
      setError(null)
      return
    }
    const entity = getTemplateEntity(entityKey)
    if (!entity?.graphqlTypeName) {
      setDirectFields([])
      setCatalogGroups([])
      setError(new Error(`Unknown entity: ${entityKey}`))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await graphqlClient.request<{ __type: IntrospectionType | null }>(INTROSPECTION_QUERY, {
        name: entity.graphqlTypeName
      })
      const type = data?.__type

      if (!type) {
        const { direct, catalogs } = getFallbackForMissingType(entityKey)
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }
      if (type.kind === 'ENUM' && type.enumValues?.length) {
        const { direct, catalogs } = getEnumFallback()
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }
      if (!type.fields?.length) {
        const { direct, catalogs } = getNoFieldsFallback(entityKey)
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }

      const { direct, catalogs } = await processTypeFields(type, graphqlClient)
      setDirectFields(direct)
      setCatalogGroups(catalogs)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setDirectFields([])
      setCatalogGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [entityKey, accessToken, graphqlClient])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  return { directFields, catalogGroups, isLoading, error, refetch: fetchFields }
}
