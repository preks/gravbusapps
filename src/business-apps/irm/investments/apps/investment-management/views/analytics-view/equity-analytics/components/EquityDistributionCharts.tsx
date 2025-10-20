import React, { useMemo, useState, useEffect, useRef } from 'react'
import { ChartPieSliceIcon, ChartDonutIcon, PercentIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EquityInvestmentSummary } from '../../shared/types'
import { DistributionPieChart } from './shared/DistributionPieChart'
import { InvestmentSizeChart, InvestmentDurationChart } from './shared/InvestmentSizeDurationCharts'
import { calculateInvestmentSizeRanges, calculateInvestmentDurationRanges } from './shared/distributionUtils'
import { useCurrencySync } from '../../shared/hooks'
import {
  useEquityRoleDistributionCombined,
  useEquityStatusDistributionCombined,
  useEquityStakeTypeDistributionCombined,
  useEquityInvestmentTypeDistributionCombined
} from '../hooks'

interface EquityDistributionChartsProps extends BusinessAppContextProps {
  rawInvestments: EquityInvestmentSummary[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityDistributionCharts: React.FC<EquityDistributionChartsProps> = context => {
  const { rawInvestments, masterCurrency, availableCurrencies } = context

  // Currency state for count-based charts - start with "All Currencies", then sync with master
  const [roleCountCurrency, setRoleCountCurrency] = useState<string>('All Currencies')
  const [statusCountCurrency, setStatusCountCurrency] = useState<string>('All Currencies')
  const [stakeTypeCountCurrency, setStakeTypeCountCurrency] = useState<string>('All Currencies')
  const [investmentTypeCountCurrency, setInvestmentTypeCountCurrency] = useState<string>('All Currencies')

  const prevMasterCurrencyForCount = useRef<string>(masterCurrency)

  // Currency sync hooks for amount-based charts (synced with master currency) - Must be declared before aggregate hooks
  const [roleAmountCurrency, setRoleAmountCurrency] = useCurrencySync(masterCurrency)
  const [statusAmountCurrency, setStatusAmountCurrency] = useCurrencySync(masterCurrency)
  const [stakeTypeAmountCurrency, setStakeTypeAmountCurrency] = useCurrencySync(masterCurrency)
  const [investmentTypeAmountCurrency, setInvestmentTypeAmountCurrency] = useCurrencySync(masterCurrency)
  const [investmentSizeCurrency, setInvestmentSizeCurrency] = useCurrencySync(masterCurrency)

  // Fetch BOTH role count and amount distribution (combined - avoids duplicate GetDistinctRoles)
  const {
    roleCountDistribution: roleDistributionData,
    roleAmountDistribution: roleAmountDistributionData,
    isLoading: roleDistributionLoading,
    error: roleDistributionError
  } = useEquityRoleDistributionCombined(context, roleCountCurrency, roleAmountCurrency)

  // Fetch BOTH status count and amount distribution (combined - avoids duplicate GetDistinctStatuses)
  const {
    statusCountDistribution: statusDistributionData,
    statusAmountDistribution: statusAmountDistributionData,
    isLoading: statusDistributionLoading,
    error: statusDistributionError
  } = useEquityStatusDistributionCombined(context, statusCountCurrency, statusAmountCurrency)

  // Fetch BOTH stake type count and amount distribution (combined - avoids duplicate GetDistinctStakeTypes)
  const {
    stakeTypeCountDistribution: stakeTypeDistributionData,
    stakeTypeAmountDistribution: stakeTypeAmountDistributionData,
    isLoading: stakeTypeDistributionLoading,
    error: stakeTypeDistributionError
  } = useEquityStakeTypeDistributionCombined(context, stakeTypeCountCurrency, stakeTypeAmountCurrency)

  // Fetch BOTH investment type count and amount distribution (combined - avoids duplicate GetDistinctInvestmentTypes)
  const {
    investmentTypeCountDistribution: investmentTypeDistributionData,
    investmentTypeAmountDistribution: investmentTypeAmountDistributionData,
    isLoading: investmentTypeDistributionLoading,
    error: investmentTypeDistributionError
  } = useEquityInvestmentTypeDistributionCombined(context, investmentTypeCountCurrency, investmentTypeAmountCurrency)

  // Sync count currencies with master currency when it actually changes
  useEffect(() => {
    // Only sync if the master currency has actually changed
    if (prevMasterCurrencyForCount.current !== masterCurrency) {
      setRoleCountCurrency(masterCurrency)
      setStatusCountCurrency(masterCurrency)
      setStakeTypeCountCurrency(masterCurrency)
      setInvestmentTypeCountCurrency(masterCurrency)
    }
    prevMasterCurrencyForCount.current = masterCurrency
  }, [masterCurrency])

  // Enhanced currency options with "All Currencies" option for count charts
  const currencyOptionsWithAll = ['All Currencies', ...availableCurrencies]

  // Helper function for consistent currency formatting
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(amount)
  }
  // Transform data for pie charts - Role (using aggregate query)
  const roleCountData = useMemo(() => {
    if (roleDistributionLoading || roleDistributionError) {
      return []
    }

    // Transform role distribution data to chart format
    return roleDistributionData.map(role => ({
      type: role.roleValue || 'Unknown',
      count: role.count
    }))
  }, [roleDistributionData, roleDistributionLoading, roleDistributionError])

  // Transform role amount data from combined aggregate query
  const roleAmountData = useMemo(() => {
    if (roleDistributionLoading || roleDistributionError) {
      return []
    }

    // Transform role amount distribution data to chart format
    return roleAmountDistributionData.map(role => ({
      type: role.roleValue || 'Unknown',
      count: 0, // Not used for amount charts
      totalAmount: role.totalAmount
    }))
  }, [roleAmountDistributionData, roleDistributionLoading, roleDistributionError])

  // Transform status count data from aggregate query
  const statusCountData = useMemo(() => {
    if (statusDistributionLoading || statusDistributionError) {
      return []
    }

    return statusDistributionData.map(status => ({
      type: status.statusValue || 'Unknown',
      count: status.count
    }))
  }, [statusDistributionData, statusDistributionLoading, statusDistributionError])

  // Transform status amount data from combined aggregate query
  const statusAmountData = useMemo(() => {
    if (statusDistributionLoading || statusDistributionError) {
      return []
    }

    return statusAmountDistributionData.map(status => ({
      type: status.statusValue || 'Unknown',
      count: 0, // Not used for amount charts
      totalAmount: status.totalAmount
    }))
  }, [statusAmountDistributionData, statusDistributionLoading, statusDistributionError])

  // Transform stake type count data from combined aggregate query
  const stakeTypeCountData = useMemo(() => {
    if (stakeTypeDistributionLoading || stakeTypeDistributionError) {
      return []
    }

    return stakeTypeDistributionData.map(stakeType => ({
      type: stakeType.stakeTypeValue || 'Unknown',
      count: stakeType.count
    }))
  }, [stakeTypeDistributionData, stakeTypeDistributionLoading, stakeTypeDistributionError])

  // Transform stake type amount data from combined aggregate query
  const stakeTypeAmountData = useMemo(() => {
    if (stakeTypeDistributionLoading || stakeTypeDistributionError) {
      return []
    }

    return stakeTypeAmountDistributionData.map(stakeType => ({
      type: stakeType.stakeTypeValue || 'Unknown',
      count: 0, // Not used for amount charts
      totalAmount: stakeType.totalAmount
    }))
  }, [stakeTypeAmountDistributionData, stakeTypeDistributionLoading, stakeTypeDistributionError])

  // Transform investment type count data from combined aggregate query
  const investmentTypeCountData = useMemo(() => {
    if (investmentTypeDistributionLoading || investmentTypeDistributionError) {
      return []
    }

    return investmentTypeDistributionData.map(investmentType => ({
      type: investmentType.investmentTypeValue || 'Unknown',
      count: investmentType.count
    }))
  }, [investmentTypeDistributionData, investmentTypeDistributionLoading, investmentTypeDistributionError])

  // Transform investment type amount data from combined aggregate query
  const investmentTypeAmountData = useMemo(() => {
    if (investmentTypeDistributionLoading || investmentTypeDistributionError) {
      return []
    }

    return investmentTypeAmountDistributionData.map(investmentType => ({
      type: investmentType.investmentTypeValue || 'Unknown',
      count: 0, // Not used for amount charts
      totalAmount: investmentType.totalAmount
    }))
  }, [investmentTypeAmountDistributionData, investmentTypeDistributionLoading, investmentTypeDistributionError])

  // Calculate investment size and duration ranges
  const investmentSizeData = useMemo(
    () => calculateInvestmentSizeRanges(rawInvestments, investmentSizeCurrency),
    [rawInvestments, investmentSizeCurrency]
  )

  const investmentDurationData = useMemo(() => calculateInvestmentDurationRanges(rawInvestments), [rawInvestments])

  return (
    <>
      {/* Role Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Role Distribution by Count (${roleCountCurrency === 'All' ? 'All Currencies' : roleCountCurrency})`}
          description="Distribution of equity positions by role"
          icon={ChartPieSliceIcon}
          iconVariant="default"
          data={roleCountData}
          valueType="count"
          currency={roleCountCurrency}
          onCurrencyChange={setRoleCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
        />
        <DistributionPieChart
          title={`Role Distribution by Total Amount (${roleAmountCurrency})`}
          description="Total amount by role"
          icon={CurrencyCircleDollarIcon}
          iconVariant="secondary"
          data={roleAmountData}
          valueType="amount"
          currency={roleAmountCurrency}
          onCurrencyChange={setRoleAmountCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Status Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Status Distribution by Count (${statusCountCurrency === 'All' ? 'All Currencies' : statusCountCurrency})`}
          description="Distribution by investment status"
          icon={ChartDonutIcon}
          iconVariant="default"
          data={statusCountData}
          valueType="count"
          currency={statusCountCurrency}
          onCurrencyChange={setStatusCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
        />
        <DistributionPieChart
          title={`Status Distribution by Total Amount (${statusAmountCurrency})`}
          description="Total amount by status"
          icon={CurrencyCircleDollarIcon}
          iconVariant="secondary"
          data={statusAmountData}
          valueType="amount"
          currency={statusAmountCurrency}
          onCurrencyChange={setStatusAmountCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Stake Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Stake Type Distribution by Count (${stakeTypeCountCurrency === 'All' ? 'All Currencies' : stakeTypeCountCurrency})`}
          description="Distribution by stake type"
          icon={PercentIcon}
          iconVariant="success"
          data={stakeTypeCountData}
          valueType="count"
          currency={stakeTypeCountCurrency}
          onCurrencyChange={setStakeTypeCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
        />
        <DistributionPieChart
          title={`Stake Type Distribution by Total Amount (${stakeTypeAmountCurrency})`}
          description="Total amount by stake type"
          icon={CurrencyCircleDollarIcon}
          iconVariant="warning"
          data={stakeTypeAmountData}
          valueType="amount"
          currency={stakeTypeAmountCurrency}
          onCurrencyChange={setStakeTypeAmountCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Investment Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Investment Type Distribution by Count (${investmentTypeCountCurrency === 'All' ? 'All Currencies' : investmentTypeCountCurrency})`}
          description="Distribution by investment type classification"
          icon={ChartPieSliceIcon}
          iconVariant="secondary"
          data={investmentTypeCountData}
          valueType="count"
          currency={investmentTypeCountCurrency}
          onCurrencyChange={setInvestmentTypeCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
        />
        <DistributionPieChart
          title={`Investment Type Distribution by Total Amount (${investmentTypeAmountCurrency})`}
          description="Total amount by investment type"
          icon={CurrencyCircleDollarIcon}
          iconVariant="default"
          data={investmentTypeAmountData}
          valueType="amount"
          currency={investmentTypeAmountCurrency}
          onCurrencyChange={setInvestmentTypeAmountCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Investment Size & Duration Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <InvestmentSizeChart
          data={investmentSizeData}
          currency={investmentSizeCurrency}
          onCurrencyChange={setInvestmentSizeCurrency}
          availableCurrencies={availableCurrencies}
        />
        <InvestmentDurationChart data={investmentDurationData} />
      </div>
    </>
  )
}
