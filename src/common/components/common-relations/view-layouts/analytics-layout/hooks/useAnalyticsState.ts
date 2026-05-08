/**
 * Shared state management hook for analytics views
 * Manages all state for time filters, pipeline selections, and currencies
 * Used by both CRM and IRM analytics views
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getInitialAnalyticsTab,
  updateAnalyticsTabUrl,
  initializeAnalyticsTabUrl,
  TimeFilter
} from '../utils/analyticsViewHelpers'
import type { AnalyticsTabKey } from '../AnalyticsLayout'

export interface AnalyticsStateConfig {
  defaultCurrency?: string
  defaultTimeFilter?: TimeFilter
}

export interface AnalyticsState {
  // Tab management
  activeTab: AnalyticsTabKey
  handleTabChange: (tab: AnalyticsTabKey) => void

  // Time filters
  leadsTimeFilter: TimeFilter
  setLeadsTimeFilter: (filter: TimeFilter) => void
  accountsTimeFilter: TimeFilter
  setAccountsTimeFilter: (filter: TimeFilter) => void
  oppTimeFilter: TimeFilter
  setOppTimeFilter: (filter: TimeFilter) => void
  contactsTimeFilter: TimeFilter
  setContactsTimeFilter: (filter: TimeFilter) => void
  revenueTimeFilter: TimeFilter
  setRevenueTimeFilter: (filter: TimeFilter) => void

  // Pipeline selections
  revenuePipelineId?: string
  setRevenuePipelineId: (id: string | undefined) => void
  healthPipelineId?: string
  setHealthPipelineId: (id: string | undefined) => void
  oppLifecyclePipelineId?: string
  setOppLifecyclePipelineId: (id: string | undefined) => void
  selectedStagePipelineId?: string
  setSelectedStagePipelineId: (id: string | undefined) => void

  // Currencies
  kpiCurrency: string
  setKpiCurrency: (currency: string) => void
  revenueCurrency: string
  setRevenueCurrency: (currency: string) => void
  accountsCurrency: string
  setAccountsCurrency: (currency: string) => void
  opportunitiesKpiCurrency: string
  setOpportunitiesKpiCurrency: (currency: string) => void
  topDealsCurrency: string
  setTopDealsCurrency: (currency: string) => void
}

export function useAnalyticsState(config: AnalyticsStateConfig = {}): AnalyticsState {
  const { defaultCurrency = 'EUR', defaultTimeFilter = 'quarter' } = config

  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>(getInitialAnalyticsTab())

  const handleTabChange = useCallback((tab: AnalyticsTabKey) => {
    setActiveTab(tab)
    updateAnalyticsTabUrl(tab)
  }, [])

  // Initialize URL on mount if not present
  useEffect(() => {
    initializeAnalyticsTabUrl(activeTab)
  }, []) // Run only on mount

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialAnalyticsTab()
      setActiveTab(newTab)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // ============================================================================
  // TIME FILTERS
  // ============================================================================

  const [leadsTimeFilter, setLeadsTimeFilter] = useState<TimeFilter>(defaultTimeFilter)
  const [accountsTimeFilter, setAccountsTimeFilter] = useState<TimeFilter>(defaultTimeFilter)
  const [oppTimeFilter, setOppTimeFilter] = useState<TimeFilter>(defaultTimeFilter)
  const [contactsTimeFilter, setContactsTimeFilter] = useState<TimeFilter>(defaultTimeFilter)
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<TimeFilter>('sixMonths')

  // ============================================================================
  // PIPELINE SELECTIONS
  // ============================================================================

  const [revenuePipelineId, setRevenuePipelineId] = useState<string | undefined>(undefined)
  const [healthPipelineId, setHealthPipelineId] = useState<string | undefined>(undefined)
  const [oppLifecyclePipelineId, setOppLifecyclePipelineId] = useState<string | undefined>(undefined)
  const [selectedStagePipelineId, setSelectedStagePipelineId] = useState<string | undefined>(undefined)

  // ============================================================================
  // CURRENCIES
  // ============================================================================

  const [kpiCurrency, setKpiCurrency] = useState(defaultCurrency) // Master currency for overview
  const [revenueCurrency, setRevenueCurrency] = useState(defaultCurrency)
  const [accountsCurrency, setAccountsCurrency] = useState(defaultCurrency)
  const [opportunitiesKpiCurrency, setOpportunitiesKpiCurrency] = useState(defaultCurrency)
  const [topDealsCurrency, setTopDealsCurrency] = useState(defaultCurrency)

  // ============================================================================
  // CURRENCY SYNC EFFECTS
  // ============================================================================

  // Sync revenue currency when master KPI currency changes
  useEffect(() => {
    setRevenueCurrency(kpiCurrency)
  }, [kpiCurrency])

  // Sync top deals currency when opportunities KPI currency changes
  useEffect(() => {
    setTopDealsCurrency(opportunitiesKpiCurrency)
  }, [opportunitiesKpiCurrency])

  // ============================================================================
  // RETURN STATE AND SETTERS
  // ============================================================================

  return {
    // Tab management
    activeTab,
    handleTabChange,

    // Time filters
    leadsTimeFilter,
    setLeadsTimeFilter,
    accountsTimeFilter,
    setAccountsTimeFilter,
    oppTimeFilter,
    setOppTimeFilter,
    contactsTimeFilter,
    setContactsTimeFilter,
    revenueTimeFilter,
    setRevenueTimeFilter,

    // Pipeline selections
    revenuePipelineId,
    setRevenuePipelineId,
    healthPipelineId,
    setHealthPipelineId,
    oppLifecyclePipelineId,
    setOppLifecyclePipelineId,
    selectedStagePipelineId,
    setSelectedStagePipelineId,

    // Currencies
    kpiCurrency,
    setKpiCurrency,
    revenueCurrency,
    setRevenueCurrency,
    accountsCurrency,
    setAccountsCurrency,
    opportunitiesKpiCurrency,
    setOpportunitiesKpiCurrency,
    topDealsCurrency,
    setTopDealsCurrency
  }
}
