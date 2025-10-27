import React, { useEffect, useMemo, useState } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, FireOutlined, ShopOutlined, TrophyOutlined } from '@ant-design/icons'
// import type { InvestmentLead } from "@/common/data/investment/types";
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadStatisticsQueries } from '../queries/LeadStatisticsQueries'

interface LeadStatisticsProps extends BusinessAppContextProps {
  onRefreshReady?: (refreshFunction: () => void) => void
}

export const LeadStatistics: React.FC<LeadStatisticsProps> = ({ onRefreshReady, ...context }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { fetchRecentLeadsWithTrend, fetchHotLeadsWithTrend, fetchConversionRateWithTrend, fetchMostCommonLeadSource } =
    useLeadStatisticsQueries(context)

  const [recent, setRecent] = useState<{
    current: number
    changePercent: number
    isPositive: boolean
  }>({ current: 0, changePercent: 0, isPositive: true })
  const [hot, setHot] = useState<{
    current: number
    changePercent: number
    isPositive: boolean
  }>({ current: 0, changePercent: 0, isPositive: true })
  const [conversion, setConversion] = useState<{
    current: number
    currentRate: number
    currentTotal: number
    changePercent: number
    isPositive: boolean
  }>({
    current: 0,
    currentRate: 0,
    currentTotal: 0,
    changePercent: 0,
    isPositive: true
  })
  const [topSource, setTopSource] = useState<string>('N/A')

  // Create a reusable load function for refreshing statistics
  const loadStatistics = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [r, h, c, s] = await Promise.all([
        fetchRecentLeadsWithTrend(),
        fetchHotLeadsWithTrend(),
        fetchConversionRateWithTrend(),
        fetchMostCommonLeadSource()
      ])
      const rChange = r.previous > 0 ? ((r.current - r.previous) / r.previous) * 100 : r.current > 0 ? 100 : 0
      const hChange = h.previous > 0 ? ((h.current - h.previous) / h.previous) * 100 : h.current > 0 ? 100 : 0
      setRecent({
        current: r.current,
        changePercent: rChange,
        isPositive: r.current - r.previous >= 0
      })
      setHot({
        current: h.current,
        changePercent: hChange,
        isPositive: h.current - h.previous >= 0
      })
      const currentRate = c.currentTotal > 0 ? (c.currentConverted / c.currentTotal) * 100 : 0
      const previousRate = c.previousTotal > 0 ? (c.previousConverted / c.previousTotal) * 100 : 0
      const convChange = previousRate > 0 ? currentRate - previousRate : currentRate > 0 ? 100 : 0
      setConversion({
        current: c.currentConverted,
        currentRate,
        currentTotal: c.currentTotal,
        changePercent: convChange,
        isPositive: convChange >= 0
      })
      setTopSource(s)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load lead statistics'))
    } finally {
      setIsLoading(false)
    }
  }

  // Load statistics on component mount
  useEffect(() => {
    loadStatistics()
    // Run once on mount; hooks are memoized with useCallback
  }, [])

  // Pass the refresh function to parent component
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(loadStatistics)
    }
  }, [onRefreshReady])

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Get current year for display
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-leads',
      title: 'Recent Leads',
      value: recent.current,
      prefix: <UserOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'New leads (past 2 weeks)',
      trend: {
        value: formatTrendPercent(recent.changePercent),
        positive: recent.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'hot-leads',
      title: 'Hot Leads',
      value: hot.current,
      prefix: <FireOutlined />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'High priority prospects',
      trend: {
        value: formatTrendPercent(hot.changePercent),
        positive: hot.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'top-lead-source',
      title: 'Top Lead Source',
      value: topSource,
      prefix: <ShopOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'Most common in recent leads'
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: conversion.currentRate,
      prefix: <TrophyOutlined />,
      color: '#722ed1',
      precision: 1,
      suffix: '%',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: `${conversion.current} converted in ${currentYear}`,
      trend: {
        value: formatTrendPercent(conversion.changePercent),
        positive: conversion.isPositive,
        description: 'vs last year'
      }
    }
  ]

  return (
    <div data-testid="lead-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadStatistics}
        skeletonCount={4}
        emptyText="No lead statistics available."
        data-testid="lead-statistics-with-trend"
      />
    </div>
  )
}
