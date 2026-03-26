/**
 * useTemplateEntityFields
 *
 * Fetches mappable fields for a template entity from GraphQL introspection.
 * Uses the registry's graphqlTypeName (e.g. JobCandidate) to introspect
 * __type(name) and optionally nested object fields (e.g. address.locality).
 * No fallback – fields come from GraphQL only.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTemplateEntity } from '../entities'
import translations from '../_i18n'

type TranslateFn = (key: string, vars?: Record<string, string>) => string

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

/** Build fallback sub-fields for Currency catalog when GraphQL introspection returns no fields */
function getCurrencyCatalogFallbackSubfields(t: TranslateFn): TemplateEntityFieldFromGraphQL[] {
  return [
    { key: 'code', displayName: t('template-field-code') },
    { key: 'description', displayName: t('template-field-description') },
    { key: 'id', displayName: t('template-field-id') },
    { key: 'value', displayName: t('template-field-value') },
    { key: 'displayName', displayName: t('template-field-display-name') }
  ]
}

/**
 * Catalog/reference fields shown under "Catalog values" with sub-fields (displayName, code, etc.).
 * At document generation time the backend resolves the ref and substitutes the chosen sub-field
 * (e.g. {{company_address.countryRef.displayName}} → resolved country name).
 */
const ALLOWED_CATALOG_FIELD_KEYS = new Set(['contractType', 'employmentType', 'countryRef', 'country', 'currencyRef'])

/**
 * Relationship fields that are always shown as direct nested fields (e.g. "Organizational Unit → Name")
 * even when the nested type looks like a catalog. Ensures org unit name and similar are available
 * like Job Position.
 */
const RELATIONSHIP_FIELDS_ALWAYS_DIRECT = new Set(['organizationalUnit', 'organizational_unit'])

/**
 * Entity keys that get placeholder fields (value, displayName, code) when GraphQL introspection
 * returns no type or no fields. Includes catalog entities and expense entities.
 */
const ENTITY_KEYS_WITH_PLACEHOLDER_FALLBACK = new Set([
  'contract_type',
  'employment_type',
  'currency',
  'adv_payment',
  'expense_plan',
  'expense_request_trip'
])

/** Exclude catalog ref ID fields from direct list (e.g. academicTitleRef, genderRef) – keep table fields only */
function isRefIdField(fieldName: string): boolean {
  return fieldName.endsWith('Ref') || fieldName.endsWith('RefId')
}

/** Ref fields we always show so user can insert e.g. {{ adv_payment.currency_ref }} */
const ALLOWED_REF_FIELDS = new Set(['currencyRef', 'currency_ref'])

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

function getCatalogPlaceholderFields(t: TranslateFn): TemplateEntityFieldFromGraphQL[] {
  return [
    { key: 'value', displayName: t('template-field-value') },
    { key: 'displayName', displayName: t('template-field-display-name') },
    { key: 'code', displayName: t('template-field-code') }
  ]
}

/** Extra fields for expense entities (adv_payment, expense_plan, expense_request_trip) when GraphQL has no/empty type */
function getExpensePlaceholderFields(t: TranslateFn): TemplateEntityFieldFromGraphQL[] {
  return [
    { key: 'amount', displayName: t('template-field-amount') },
    { key: 'currency_ref', displayName: t('template-field-currency-ref') },
    ...getCatalogPlaceholderFields(t)
  ]
}

const EXPENSE_ENTITY_KEYS = new Set(['adv_payment', 'expense_plan', 'expense_request_trip'])

/** Currency catalog group for fallback (same as Country under Catalog values) */
function getCurrencyCatalogGroupFallback(t: TranslateFn): TemplateCatalogGroup {
  const subFields = getCurrencyCatalogFallbackSubfields(t)
  return {
    fieldKey: 'currency_ref',
    displayName: t('template-field-currency'),
    subFields: subFields.map(f => ({
      key: `currency_ref.${f.key}`,
      displayName: f.displayName
    }))
  }
}

function getFallbackForMissingType(
  entityKey: string,
  t: TranslateFn
): {
  direct: TemplateEntityFieldFromGraphQL[]
  catalogs: TemplateCatalogGroup[]
} {
  const direct: TemplateEntityFieldFromGraphQL[] = []
  const catalogs: TemplateCatalogGroup[] = []
  if (ENTITY_KEYS_WITH_PLACEHOLDER_FALLBACK.has(entityKey)) {
    direct.push(
      ...(EXPENSE_ENTITY_KEYS.has(entityKey) ? getExpensePlaceholderFields(t) : getCatalogPlaceholderFields(t))
    )
    if (EXPENSE_ENTITY_KEYS.has(entityKey)) catalogs.push(getCurrencyCatalogGroupFallback(t, 'currency_ref'))
  }
  return { direct, catalogs }
}

function getEnumFallback(t: TranslateFn): {
  direct: TemplateEntityFieldFromGraphQL[]
  catalogs: TemplateCatalogGroup[]
} {
  return { direct: [...getCatalogPlaceholderFields(t)], catalogs: [] }
}

function getNoFieldsFallback(
  entityKey: string,
  t: TranslateFn
): {
  direct: TemplateEntityFieldFromGraphQL[]
  catalogs: TemplateCatalogGroup[]
} {
  return getFallbackForMissingType(entityKey, t)
}

async function processTypeFields(
  type: IntrospectionType,
  graphqlClient: ReturnType<typeof useGraphQLClient>,
  t: TranslateFn
): Promise<{ direct: TemplateEntityFieldFromGraphQL[]; catalogs: TemplateCatalogGroup[] }> {
  const direct: TemplateEntityFieldFromGraphQL[] = []
  const catalogs: TemplateCatalogGroup[] = []
  if (!type.fields?.length) return { direct, catalogs }

  for (const field of type.fields) {
    const typeInfo = field.type
    if (isScalarOrEnum(typeInfo)) {
      const showField = !isRefIdField(field.name) || ALLOWED_REF_FIELDS.has(field.name)
      if (showField) {
        direct.push({
          key: field.name,
          displayName:
            field.name === 'currencyRef' || field.name === 'currency_ref'
              ? t('template-field-currency-ref')
              : humanizeFieldName(field.name)
        })
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

        const showAsDirectNested = !isCatalog || RELATIONSHIP_FIELDS_ALWAYS_DIRECT.has(field.name)
        if (
          isCatalog &&
          ALLOWED_CATALOG_FIELD_KEYS.has(field.name) &&
          !RELATIONSHIP_FIELDS_ALWAYS_DIRECT.has(field.name)
        ) {
          const subFields = filterCatalogSubFields(field.name, nestedType)
          if (subFields.length > 0) {
            catalogs.push({
              fieldKey: field.name,
              displayName:
                field.name === 'currencyRef' || field.name === 'currency_ref'
                  ? t('template-field-currency')
                  : humanizeFieldName(field.name),
              subFields
            })
          } else if (field.name === 'currencyRef' || field.name === 'currency_ref') {
            catalogs.push(getCurrencyCatalogGroupFallback(t, field.name))
          }
        }
        if (showAsDirectNested) {
          for (const sub of nestedType.fields) {
            if (isScalarOrEnum(sub.type)) {
              direct.push({
                key: `${field.name}.${sub.name}`,
                displayName: `${humanizeFieldName(field.name)} → ${humanizeFieldName(sub.name)}`
              })
            }
          }
        }
        if (field.name === 'currencyRef' || field.name === 'currency_ref') {
          direct.push({ key: field.name, displayName: t('template-field-currency-ref') })
        }
      } catch {
        if (field.name === 'currencyRef' || field.name === 'currency_ref') {
          direct.push({ key: field.name, displayName: t('template-field-currency-ref') })
          catalogs.push(getCurrencyCatalogGroupFallback(t, field.name))
        }
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
  const { t } = useTranslation(translations)
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
      setError(new Error(t('template-field-unknown-entity', { key: entityKey })))
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
        const { direct, catalogs } = getFallbackForMissingType(entityKey, t)
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }
      if (type.kind === 'ENUM' && type.enumValues?.length) {
        const { direct, catalogs } = getEnumFallback(t)
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }
      if (!type.fields?.length) {
        const { direct, catalogs } = getNoFieldsFallback(entityKey, t)
        setDirectFields(direct)
        setCatalogGroups(catalogs)
        return
      }

      const { direct, catalogs } = await processTypeFields(type, graphqlClient, t)

      // Add synthetic fields for specific entities
      const syntheticFields: TemplateEntityFieldFromGraphQL[] = []

      if (entityKey === 'adv_payment' || entityKey === 'expense_plan') {
        syntheticFields.push(
          {
            key: 'approvedBy',
            displayName: t('template-field-approved-by')
          },
          {
            key: 'approvalDate',
            displayName: t('template-field-approval-date')
          }
        )
      }

      if (entityKey === 'employee_position') {
        syntheticFields.push({
          key: 'supervisorName',
          displayName: t('template-field-supervisor-name')
        })
      }

      setDirectFields([...direct, ...syntheticFields])
      setCatalogGroups(catalogs)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('template-field-unknown-error')))
      setDirectFields([])
      setCatalogGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [entityKey, accessToken, graphqlClient, t])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  return { directFields, catalogGroups, isLoading, error, refetch: fetchFields }
}
