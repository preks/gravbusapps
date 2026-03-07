/**
 * Entity Analytics Executor - executes aggregate queries via GraphQL
 * for sheets that have an entityDataSource. Falls back to client-side
 * aggregation over board rows when GraphQL aggregation isn't feasible.
 *
 * Uses the EntityQueryDef.aggregateKey to build dynamic aggregate queries.
 */

import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { getEntityDef, buildEntityDefaultWhere, type EntityQueryDef } from '../queries/entityQueries'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import type { AggregateQuery, AggregateRow } from '../types/analytics'
import type { EntityDataSource } from '../types'

function buildAggregateGraphQL(
  def: EntityQueryDef,
  query: AggregateQuery,
  baseWhere: Record<string, unknown>
): { gql: string; variables: Record<string, unknown> } | null {
  if (!def.aggregateKey) return null

  const groupByField = def.fields.find(f => f.key === query.groupBy)
  if (!groupByField) return null

  const validMetrics = query.metrics.filter(m => m.aggregation === 'count' || def.fields.some(f => f.key === m.column))
  if (validMetrics.length === 0) return null

  const metricExpressions = validMetrics.map(m => {
    if (m.aggregation === 'count') return 'count'
    return `${m.aggregation} { ${m.column} }`
  })

  const aggregateFields = `aggregate { ${[...new Set(metricExpressions)].join('\n')} }`

  const gql = `
    query EntityAggregate($where: ${def.boolExpType}) {
      ${def.aggregateKey}(where: $where) {
        ${aggregateFields}
      }
    }
  `

  return { gql, variables: { where: baseWhere } }
}

export interface EntityAggregateResult {
  rows: AggregateRow[]
  fromEntity: boolean
  entityType: string
}

/**
 * Attempt to run a server-side aggregate query for an entity data source.
 * Returns null if entity doesn't support aggregation or query can't be mapped.
 */
export async function executeEntityAggregate(
  entityDataSource: EntityDataSource | undefined,
  query: AggregateQuery,
  accessToken: string
): Promise<EntityAggregateResult | null> {
  if (!entityDataSource || !(entityDataSource as any).enabled) return null

  const entityType = (entityDataSource as any).entityType as string
  if (!entityType) return null

  const def = getEntityDef(entityType)
  if (!def || !def.aggregateKey) return null

  try {
    graphQLClient.setAccessToken(accessToken)
    const structureId = getCurrentActiveStructureId()
    const baseWhere = buildEntityDefaultWhere(entityType, structureId)

    const built = buildAggregateGraphQL(def, query, baseWhere)
    if (!built) return null

    const result = await graphQLClient.request<Record<string, unknown>>(built.gql, built.variables)
    const aggData = result[def.aggregateKey] as { aggregate?: Record<string, unknown> } | undefined

    if (!aggData?.aggregate) return null

    const row: AggregateRow = { group: 'Total' }
    for (const m of query.metrics) {
      const metricKey = m.label || `${m.aggregation}_${m.column}`
      if (m.aggregation === 'count') {
        row[metricKey] = (aggData.aggregate.count as number) || 0
      } else {
        const aggObj = aggData.aggregate[m.aggregation] as Record<string, number> | undefined
        row[metricKey] = aggObj?.[m.column] || 0
      }
    }

    return { rows: [row], fromEntity: true, entityType }
  } catch {
    return null
  }
}

/**
 * For entity-backed sheets, build a grouped aggregate using multiple aliased queries.
 * Each unique group value gets its own aggregate alias.
 * This is a fallback when the server doesn't support native groupBy aggregates.
 */
export async function executeEntityGroupedAggregate(
  entityDataSource: EntityDataSource | undefined,
  query: AggregateQuery,
  groupValues: string[],
  accessToken: string
): Promise<EntityAggregateResult | null> {
  if (!entityDataSource || !(entityDataSource as any).enabled) return null
  if (groupValues.length === 0) return null

  const entityType = (entityDataSource as any).entityType as string
  if (!entityType) return null

  const def = getEntityDef(entityType)
  if (!def || !def.aggregateKey) return null

  const groupByField = def.fields.find(f => f.key === query.groupBy)
  if (!groupByField) return null

  try {
    graphQLClient.setAccessToken(accessToken)
    const structureId = getCurrentActiveStructureId()
    const baseWhere = buildEntityDefaultWhere(entityType, structureId)

    const aliases = groupValues.slice(0, 50).map((val, i) => {
      const countOnly = query.metrics.every(m => m.aggregation === 'count')
      return `grp_${i}: ${def.aggregateKey}(where: $where_${i}) { aggregate { count${
        countOnly
          ? ''
          : ` sum { ${query.metrics
              .filter(m => m.aggregation !== 'count')
              .map(m => m.column)
              .join(' ')} }`
      } } }`
    })

    const varDefs = groupValues.slice(0, 50).map((_, i) => `$where_${i}: ${def.boolExpType}`)
    const gql = `query GroupedAgg(${varDefs.join(', ')}) {\n${aliases.join('\n')}\n}`
    const variables: Record<string, unknown> = {}
    groupValues.slice(0, 50).forEach((val, i) => {
      variables[`where_${i}`] = { ...baseWhere, [query.groupBy]: { _eq: val } }
    })

    const result = await graphQLClient.request<Record<string, unknown>>(gql, variables)

    const rows: AggregateRow[] = groupValues.slice(0, 50).map((val, i) => {
      const aggData = result[`grp_${i}`] as { aggregate?: Record<string, unknown> } | undefined
      const row: AggregateRow = { group: val }
      for (const m of query.metrics) {
        const metricKey = m.label || `${m.aggregation}_${m.column}`
        if (m.aggregation === 'count') {
          row[metricKey] = (aggData?.aggregate?.count as number) || 0
        } else {
          const sumObj = aggData?.aggregate?.sum as Record<string, number> | undefined
          row[metricKey] = sumObj?.[m.column] || 0
        }
      }
      return row
    })

    return { rows, fromEntity: true, entityType }
  } catch {
    return null
  }
}
