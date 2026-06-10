import { useCallback, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DataQuerySpec } from '../types/models'

const NON_READONLY_PATTERN = /\b(mutation|subscription)\b/i

/** Defense-in-depth: reject any spec query that is not a read-only GraphQL query
 * before we ever send it. The backend already enforces this, and the access token
 * scopes permissions, but we re-check on the client too. */
export function specIsReadOnly(query: string): boolean {
  const preamble = query.split('{')[0] ?? ''
  return !NON_READONLY_PATTERN.test(preamble)
}

export interface DisplayDataRequeryState {
  rows: Array<Record<string, unknown>>
  loading: boolean
  error: string | null
}

export interface DisplayDataRequeryResult extends DisplayDataRequeryState {
  /** Run the embedded query with optional variable overrides and return the rows. */
  run: (variableOverrides?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
}

/** Re-run a read-only GraphQL query embedded in a display payload (DataQuerySpec)
 * directly from the frontend, so pagination / filter / drill-down do not require a
 * new flowbot turn. */
export function useDisplayDataRequery(accessToken: string, spec?: DataQuerySpec | null): DisplayDataRequeryResult {
  const client = useGraphQLClient(accessToken)
  const [state, setState] = useState<DisplayDataRequeryState>({ rows: [], loading: false, error: null })

  const run = useCallback(
    async (variableOverrides?: Record<string, unknown>): Promise<Array<Record<string, unknown>>> => {
      if (!spec) {
        return []
      }
      if (!specIsReadOnly(spec.query)) {
        const message = 'Refusing to run a query that is not read-only.'
        console.error('[useDisplayDataRequery]', message)
        setState({ rows: [], loading: false, error: message })
        return []
      }

      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const variables = { ...spec.variables, ...(variableOverrides ?? {}) }
        const data = await client.request<Record<string, unknown>>(spec.query, variables)
        const rowsKey = spec.rowsPath ?? Object.keys(data ?? {})[0]
        const candidate = rowsKey ? (data as Record<string, unknown>)?.[rowsKey] : undefined
        const rows = Array.isArray(candidate) ? (candidate as Array<Record<string, unknown>>) : []
        setState({ rows, loading: false, error: null })
        return rows
      } catch (error) {
        const message = error instanceof Error ? error.message : 'GraphQL request failed'
        console.error('[useDisplayDataRequery] request failed')
        setState({ rows: [], loading: false, error: message })
        return []
      }
    },
    [client, spec]
  )

  return { ...state, run }
}
