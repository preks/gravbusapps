/**
 * AI Insights - Page Analytics Integration
 *
 * Sends page analytics context to AI chat backend
 *
 * Supported Modes:
 * - header: KPI data
 * - snapshot: Full page DOM snapshot
 */

export * from './types/analytics-context'
export * from './collectors/buildAnalyticsHeader'
export * from './send/page-analytics'
export * from './hooks/usePageAnalytics'
export { InvestmentRecordAnalyticsChat } from './components/InvestmentRecordAnalyticsChat'
