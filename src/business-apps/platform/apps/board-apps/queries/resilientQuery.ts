/**
 * Wraps a GraphQL request with automatic field-removal retry.
 *
 * Handles two error shapes:
 * 1. Selection set errors: "field 'X' not found in type: 'Y'" → strips from query string
 * 2. WHERE clause errors: "field 'X' not found in type: 'YBoolExp'" → strips from variables.where
 */

import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { EntityFieldDef } from './entityQueries'

const MAX_RETRIES = 5
const FIELD_NOT_FOUND_RE = /field '(\w+)' not found in type: '(\w+)'/

export interface ResilientResult<T> {
  data: T
  query: string
  fields: EntityFieldDef[]
  removedFields: string[]
}

export async function resilientGraphQLRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  fields: EntityFieldDef[]
): Promise<ResilientResult<T>> {
  let currentQuery = query
  let currentVars = { ...variables }
  let currentFields = [...fields]
  const removedFields: string[] = []

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await graphQLClient.request<T>(currentQuery, currentVars)
      return { data, query: currentQuery, fields: currentFields, removedFields }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const match = FIELD_NOT_FOUND_RE.exec(msg)

      if (!match || attempt === MAX_RETRIES) throw err

      const badField = match[1]
      const parentType = match[2]
      removedFields.push(badField)

      if (parentType.endsWith('BoolExp')) {
        currentVars = stripFieldFromVariables(currentVars, badField)
        console.warn(`[BoardAI] Auto-fixed WHERE: removed '${badField}' from variables, retrying…`)
      } else {
        currentQuery = stripFieldFromQuery(currentQuery, badField)
        currentFields = currentFields.filter(f => f.key !== badField && !f.path.startsWith(`${badField}.`))
        console.warn(`[BoardAI] Auto-fixed query: removed field '${badField}', retrying…`)
      }
    }
  }

  throw new Error('resilientGraphQLRequest: max retries exceeded')
}

function stripFieldFromQuery(query: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let result = query
  result = result.replace(new RegExp(`\\b${escaped}\\s*\\{[^}]*\\}`, 'g'), '')
  result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '')
  result = result.replace(/\n\s*\n/g, '\n')
  return result
}

function stripFieldFromVariables(vars: Record<string, unknown>, field: string): Record<string, unknown> {
  const result = { ...vars }
  const where = result.where as Record<string, unknown> | undefined
  if (where && field in where) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [field]: _removed, ...rest } = where
    result.where = rest
  }
  return result
}
