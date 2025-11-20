/**
 * Send Page Analytics to Chat API
 *
 * Extends existing AgentInput.current_page_context with page_analytics
 * Sends analytics only once per session (on first chat open)
 */

import { AnalyticsContext, AnalyticsHeaderContext } from '../types/analytics-context'
import { buildAnalyticsHeader } from '../collectors/buildAnalyticsHeader'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'

// Track if analytics have been sent for current session
// Reset when session_id changes
let analyticsSentForSession = false
let currentSessionId: string | null = null

/**
 * Cap analytics context to byte limit by progressively removing optional fields
 *
 * @param context - Analytics context to cap
 * @param byteLimit - Maximum size in bytes (default: 6000 = 6 KB)
 * @returns Capped analytics context
 */
function capAnalytics(context: AnalyticsContext, byteLimit = 6000): AnalyticsContext {
  try {
    const encoder = new TextEncoder()
    const encode = (value: unknown) => encoder.encode(JSON.stringify(value))

    if (encode(context).length <= byteLimit) {
      return context
    }

    // For header mode - minimize to entity + kpi + meta
    if ('mode' in context && context.mode === 'header') {
      const candidates: Partial<AnalyticsHeaderContext>[] = [
        { ...context, raw: undefined },
        { ...context, raw: undefined, links: undefined },
        { ...context, raw: undefined, links: undefined, activities: undefined },
        { ...context, raw: undefined, links: undefined, activities: undefined, summary: undefined },
        {
          mode: 'header',
          entity: context.entity,
          metrics: context.metrics,
          meta: context.meta,
          contacts: context.contacts
        },
        {
          mode: 'header',
          entity: context.entity,
          metrics: context.metrics,
          meta: context.meta
        },
        {
          mode: 'header',
          entity: context.entity,
          metrics: context.metrics
        },
        {
          mode: 'header',
          entity: context.entity
        }
      ]

      for (const candidate of candidates) {
        if (encode(candidate).length <= byteLimit) {
          return candidate as AnalyticsContext
        }
      }

      return {
        mode: 'header',
        entity: context.entity
      } as AnalyticsContext
    }

    // For snapshot / other modes - return original (can log warning)
    console.warn('capAnalytics: snapshot mode not optimized, returning original')
    return context
  } catch (e) {
    console.warn('capAnalytics failed, returning original context', e)
    return context
  }
}

/**
 * Reset analytics sent flag when session changes
 */
export function resetAnalyticsSentFlag(sessionId?: string) {
  if (sessionId !== currentSessionId) {
    analyticsSentForSession = false
    currentSessionId = sessionId || null
  }
}

/**
 * Open AI Insights chat with page analytics (one-time per session)
 *
 * @param params - Chat initialization parameters
 * @returns Promise that resolves when analytics are sent (if needed)
 */
export async function openAiInsightsChatOnce(params: {
  currentPage: { url: string; route: string; view?: string }
  entity: { type: string; id: string; name?: string }
  /**
   * GraphQL client configured with a valid access token.
   * Obtain via useGraphQLClient(accessToken) in React components.
   */
  graphqlClient: GraphQLClient
  sessionId?: string
  currency?: string
}): Promise<{ page_analytics?: AnalyticsContext }> {
  const { entity, graphqlClient, sessionId, currency } = params

  // Reset flag if session changed
  if (sessionId) {
    resetAnalyticsSentFlag(sessionId)
  }

  let page_analytics: AnalyticsContext | undefined

  // Build and send analytics only once per session
  if (!analyticsSentForSession) {
    try {
      const rawHeader = await buildAnalyticsHeader({
        entity,
        graphqlClient,
        currency
      })
      // Cap analytics to 6 KB limit
      page_analytics = capAnalytics(rawHeader, 6000)
      analyticsSentForSession = true
      if (sessionId) {
        currentSessionId = sessionId
      }
    } catch (error) {
      console.error('Failed to build analytics header:', error)
      // Continue without analytics - don't block chat opening
    }
  }

  return { page_analytics }
}

/**
 * Prepare current_page_context with optional page_analytics
 *
 * This should be called when sending AgentInput to the backend
 * Backend expects CurrentPageContext with type: 'entity'|'overview'|'unknown'
 */
export function prepareCurrentPageContext(params: {
  currentPage: {
    url: string
    route: string
    view?: string
    type?: 'entity' | 'overview' | 'unknown'
    entity_name?: string
    id?: string
  }
  page_analytics?: AnalyticsContext
}): {
  type: 'entity' | 'overview' | 'unknown'
  url: string
  route?: string
  view?: string
  entity_name?: string
  id?: string
  page_analytics?: AnalyticsContext
} {
  const { currentPage, page_analytics } = params

  // Determine type based on available fields
  let type: 'entity' | 'overview' | 'unknown' = currentPage.type || 'unknown'

  if (!currentPage.type) {
    // Auto-detect type if not provided
    if (currentPage.id && currentPage.entity_name) {
      type = 'entity'
    } else if (currentPage.entity_name) {
      type = 'overview'
    } else {
      type = 'unknown'
    }
  }

  const baseContext: {
    type: 'entity' | 'overview' | 'unknown'
    url: string
    route?: string
    view?: string
    entity_name?: string
    id?: string
    page_analytics?: AnalyticsContext
  } = {
    type,
    url: currentPage.url,
    ...(currentPage.route && { route: currentPage.route }),
    ...(currentPage.view && { view: currentPage.view })
  }

  // Add type-specific fields
  if (type === 'entity') {
    if (currentPage.id) baseContext.id = currentPage.id
    if (currentPage.entity_name) baseContext.entity_name = currentPage.entity_name
  } else if (type === 'overview') {
    if (currentPage.entity_name) baseContext.entity_name = currentPage.entity_name
  }

  // Add page_analytics if provided
  if (page_analytics) {
    baseContext.page_analytics = page_analytics
  }

  return baseContext
}
