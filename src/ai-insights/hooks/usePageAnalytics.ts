/**
 * Hook for integrating page analytics into chat components
 *
 * Usage:
 * ```tsx
 * const { getPageAnalyticsContext } = usePageAnalytics({
 *   entity: { type: 'investment', id: investmentId, name: investmentName },
 *   accessToken,
 *   currency: 'EUR'
 * })
 *
 * // When sending chat message:
 * const pageContext = await getPageAnalyticsContext({
 *   url: window.location.href,
 *   route: '/irm/investments/record',
 *   view: 'investment-record',
 *   type: 'entity',
 *   entity_name: 'Investment',
 *   id: investmentId
 * })
 * form.append('current_page_context', JSON.stringify(pageContext))
 * ```
 */

import { useState, useCallback, useRef } from 'react'
import { openAiInsightsChatOnce, prepareCurrentPageContext, resetAnalyticsSentFlag } from '../send/page-analytics'
import { AnalyticsContext } from '../types/analytics-context'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UsePageAnalyticsParams {
  entity: { type: string; id: string; name?: string }
  accessToken: string
  currency?: string
  sessionId?: string
}

interface UsePageAnalyticsReturn {
  /**
   * Get current page context with analytics (one-time per session)
   * Call this when preparing AgentInput for chat API
   */
  getPageAnalyticsContext: (currentPage: {
    url: string
    route: string
    view?: string
    type?: 'entity' | 'overview' | 'unknown'
    entity_name?: string
    id?: string
  }) => Promise<{
    type: 'entity' | 'overview' | 'unknown'
    url: string
    route?: string
    view?: string
    entity_name?: string
    id?: string
    page_analytics?: AnalyticsContext
  }>
  /**
   * Reset analytics sent flag (call when session changes)
   */
  resetAnalytics: (sessionId?: string) => void
  /**
   * Manually trigger analytics collection (optional)
   */
  collectAnalytics: () => Promise<AnalyticsContext | null>
}

export function usePageAnalytics(params: UsePageAnalyticsParams): UsePageAnalyticsReturn {
  const { entity, accessToken, currency, sessionId } = params
  const [analyticsCollected, setAnalyticsCollected] = useState(false)
  const analyticsRef = useRef<AnalyticsContext | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const collectAnalytics = useCallback(async (): Promise<AnalyticsContext | null> => {
    if (analyticsRef.current) {
      return analyticsRef.current
    }

    try {
      const { page_analytics } = await openAiInsightsChatOnce({
        currentPage: {
          url: window.location.href,
          route: window.location.pathname
        },
        entity,
        graphqlClient,
        sessionId,
        currency
      })

      if (page_analytics) {
        analyticsRef.current = page_analytics
        setAnalyticsCollected(true)
        return page_analytics
      }
    } catch (error) {
      console.error('Failed to collect page analytics:', error)
    }

    return null
  }, [entity, graphqlClient, sessionId, currency])

  const getPageAnalyticsContext = useCallback(
    async (currentPage: {
      url: string
      route: string
      view?: string
      type?: 'entity' | 'overview' | 'unknown'
      entity_name?: string
      id?: string
    }) => {
      // Collect analytics once per session
      if (!analyticsCollected && !analyticsRef.current) {
        await collectAnalytics()
      }

      // Auto-detect type and entity_name from entity if not provided
      const enhancedCurrentPage = {
        ...currentPage,
        type: currentPage.type || (entity.id ? 'entity' : 'unknown'),
        entity_name: currentPage.entity_name || entity.name,
        id: currentPage.id || entity.id
      }

      return prepareCurrentPageContext({
        currentPage: enhancedCurrentPage,
        page_analytics: analyticsRef.current || undefined
      })
    },
    [analyticsCollected, collectAnalytics, entity]
  )

  const resetAnalytics = useCallback((newSessionId?: string) => {
    resetAnalyticsSentFlag(newSessionId)
    analyticsRef.current = null
    setAnalyticsCollected(false)
  }, [])

  return {
    getPageAnalyticsContext,
    resetAnalytics,
    collectAnalytics
  }
}
