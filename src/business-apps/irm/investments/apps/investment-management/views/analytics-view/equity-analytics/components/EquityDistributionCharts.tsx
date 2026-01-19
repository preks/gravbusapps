import React, { useMemo, useState, useEffect, useRef } from 'react'
import { ChartPieSliceIcon, ChartDonutIcon, PercentIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DistributionPieChart } from './shared/DistributionPieChart'
import { InvestmentSizeChart, InvestmentDurationChart } from './shared/InvestmentSizeDurationCharts'
import { useCurrencySync } from '../../shared/hooks'
import {
  useEquityRoleCountDistribution,
  useEquityRoleAmountDistribution,
  useEquityStatusCountDistribution,
  useEquityStatusAmountDistribution,
  useEquityStakeTypeCountDistribution,
  useEquityStakeTypeAmountDistribution,
  useEquityInvestmentTypeCountDistribution,
  useEquityInvestmentTypeAmountDistribution,
  useEquityInvestmentSize,
  useEquityInvestmentDuration
} from '../hooks'

interface EquityDistributionChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityDistributionCharts: React.FC<EquityDistributionChartsProps> = props => {
  const { masterCurrency, availableCurrencies, ...context } = props

  // Currency state for count-based charts - start with "All", then sync with master
  const [roleCountCurrency, setRoleCountCurrency] = useState<string>('All')
  const [statusCountCurrency, setStatusCountCurrency] = useState<string>('All')
  const [stakeTypeCountCurrency, setStakeTypeCountCurrency] = useState<string>('All')
  const [investmentTypeCountCurrency, setInvestmentTypeCountCurrency] = useState<string>('All')

  const prevMasterCurrencyForCount = useRef<string>(masterCurrency)

  // Currency sync hooks for amount-based charts (synced with master currency) - Must be declared before aggregate hooks
  const [roleAmountCurrency, setRoleAmountCurrency] = useCurrencySync(masterCurrency)
  const [statusAmountCurrency, setStatusAmountCurrency] = useCurrencySync(masterCurrency)
  const [stakeTypeAmountCurrency, setStakeTypeAmountCurrency] = useCurrencySync(masterCurrency)
  const [investmentTypeAmountCurrency, setInvestmentTypeAmountCurrency] = useCurrencySync(masterCurrency)
  const [investmentSizeCurrency, setInvestmentSizeCurrency] = useCurrencySync(masterCurrency)
  const [investmentDurationCurrency, setInvestmentDurationCurrency] = useCurrencySync(masterCurrency)

  // Fetch role count distribution independently (uses cached distinct roles)
  const {
    roleCountDistribution: roleDistributionData,
    isLoading: roleCountLoading,
    error: roleCountError
  } = useEquityRoleCountDistribution(context, roleCountCurrency)

  // Fetch role amount distribution independently (uses cached distinct roles)
  const {
    roleAmountDistribution: roleAmountDistributionData,
    isLoading: roleAmountLoading,
    error: roleAmountError
  } = useEquityRoleAmountDistribution(context, roleAmountCurrency)

  // Fetch status count distribution independently (uses cached distinct statuses)
  const {
    statusCountDistribution: statusDistributionData,
    isLoading: statusCountLoading,
    error: statusCountError
  } = useEquityStatusCountDistribution(context, statusCountCurrency)

  // Fetch status amount distribution independently (uses cached distinct statuses)
  const {
    statusAmountDistribution: statusAmountDistributionData,
    isLoading: statusAmountLoading,
    error: statusAmountError
  } = useEquityStatusAmountDistribution(context, statusAmountCurrency)

  // Fetch stake type count distribution independently (uses cached distinct stake types)
  const {
    stakeTypeCountDistribution: stakeTypeDistributionData,
    isLoading: stakeTypeCountLoading,
    error: stakeTypeCountError
  } = useEquityStakeTypeCountDistribution(context, stakeTypeCountCurrency)

  // Fetch stake type amount distribution independently (uses cached distinct stake types)
  const {
    stakeTypeAmountDistribution: stakeTypeAmountDistributionData,
    isLoading: stakeTypeAmountLoading,
    error: stakeTypeAmountError
  } = useEquityStakeTypeAmountDistribution(context, stakeTypeAmountCurrency)

  // Fetch investment type count distribution independently (uses cached distinct investment types)
  const {
    investmentTypesCount: investmentTypeDistributionData,
    isLoading: investmentTypeCountLoading,
    error: investmentTypeCountError
  } = useEquityInvestmentTypeCountDistribution(context, investmentTypeCountCurrency)

  // Fetch investment type amount distribution independently (uses cached distinct investment types)
  const {
    investmentTypesAmount: investmentTypeAmountDistributionData,
    isLoading: investmentTypeAmountLoading,
    error: investmentTypeAmountError
  } = useEquityInvestmentTypeAmountDistribution(context, investmentTypeAmountCurrency)

  // Fetch investment size distribution using server-side aggregates
  const {
    investmentSizeData,
    isLoading: investmentSizeLoading,
    error: investmentSizeError
  } = useEquityInvestmentSize(context, investmentSizeCurrency)

  // Fetch investment duration distribution using server-side aggregates
  const {
    investmentDurationData: investmentDurationRawData,
    isLoading: investmentDurationLoading,
    error: investmentDurationError
  } = useEquityInvestmentDuration(context, investmentDurationCurrency)

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

  // Enhanced currency options with "All" option for count charts
  const currencyOptionsWithAll = ['All', ...availableCurrencies]

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
  // Transform data for pie charts - Role (using independent queries with shared cached roles)
  const roleCountData = useMemo(() => {
    if (roleCountLoading || roleCountError) {
      return []
    }

    // Transform role distribution data to chart format and filter out zero values
    return roleDistributionData
      .filter(role => role.count && role.count > 0)
      .map(role => ({
        type: role.roleValue || 'Unknown',
        count: role.count
      }))
  }, [roleDistributionData, roleCountLoading, roleCountError])

  // Transform role amount data from independent query with shared cached roles
  const roleAmountData = useMemo(() => {
    if (roleAmountLoading || roleAmountError) {
      return []
    }

    // Transform role amount distribution data to chart format and filter out zero values
    return roleAmountDistributionData
      .filter(role => role.totalAmount && role.totalAmount > 0)
      .map(role => ({
        type: role.roleValue || 'Unknown',
        count: 0, // Not used for amount charts
        totalAmount: role.totalAmount
      }))
  }, [roleAmountDistributionData, roleAmountLoading, roleAmountError])

  // Transform status count data from independent query with shared cached statuses
  const statusCountData = useMemo(() => {
    if (statusCountLoading || statusCountError) {
      return []
    }

    return statusDistributionData
      .filter(status => status.count && status.count > 0)
      .map(status => ({
        type: status.statusValue || 'Unknown',
        count: status.count
      }))
  }, [statusDistributionData, statusCountLoading, statusCountError])

  // Transform status amount data from independent query with shared cached statuses
  const statusAmountData = useMemo(() => {
    if (statusAmountLoading || statusAmountError) {
      return []
    }

    return statusAmountDistributionData
      .filter(status => status.totalAmount && status.totalAmount > 0)
      .map(status => ({
        type: status.statusValue || 'Unknown',
        count: 0, // Not used for amount charts
        totalAmount: status.totalAmount
      }))
  }, [statusAmountDistributionData, statusAmountLoading, statusAmountError])

  // Transform stake type count data from independent query with shared cached stake types
  const stakeTypeCountData = useMemo(() => {
    if (stakeTypeCountLoading || stakeTypeCountError) {
      return []
    }

    return stakeTypeDistributionData
      .filter(stakeType => stakeType.count && stakeType.count > 0)
      .map(stakeType => ({
        type: stakeType.stakeTypeValue || 'Unknown',
        count: stakeType.count
      }))
  }, [stakeTypeDistributionData, stakeTypeCountLoading, stakeTypeCountError])

  // Transform stake type amount data from independent query with shared cached stake types
  const stakeTypeAmountData = useMemo(() => {
    if (stakeTypeAmountLoading || stakeTypeAmountError) {
      return []
    }

    return stakeTypeAmountDistributionData
      .filter(stakeType => stakeType.totalAmount && stakeType.totalAmount > 0)
      .map(stakeType => ({
        type: stakeType.stakeTypeValue || 'Unknown',
        count: 0, // Not used for amount charts
        totalAmount: stakeType.totalAmount
      }))
  }, [stakeTypeAmountDistributionData, stakeTypeAmountLoading, stakeTypeAmountError])

  // Transform investment type count data from independent query with shared cached investment types
  const investmentTypeCountData = useMemo(() => {
    if (investmentTypeCountLoading || investmentTypeCountError) {
      return []
    }

    return investmentTypeDistributionData
      .filter(investmentType => investmentType.count && investmentType.count > 0)
      .map(investmentType => ({
        type: investmentType.investmentTypeValue || 'Unknown',
        count: investmentType.count
      }))
  }, [investmentTypeDistributionData, investmentTypeCountLoading, investmentTypeCountError])

  // Transform investment type amount data from independent query with shared cached investment types
  const investmentTypeAmountData = useMemo(() => {
    if (investmentTypeAmountLoading || investmentTypeAmountError) {
      return []
    }

    return investmentTypeAmountDistributionData
      .filter(investmentType => investmentType.totalAmount && investmentType.totalAmount > 0)
      .map(investmentType => ({
        type: investmentType.investmentTypeValue || 'Unknown',
        count: 0, // Not used for amount charts
        totalAmount: investmentType.totalAmount
      }))
  }, [investmentTypeAmountDistributionData, investmentTypeAmountLoading, investmentTypeAmountError])

  // Transform investment size data from server-side aggregates to chart format
  const transformedInvestmentSizeData = useMemo(() => {
    if (investmentSizeLoading || investmentSizeError) {
      return []
    }

    return investmentSizeData
      .filter(range => range.count && range.count > 0)
      .map(range => ({
        type: range.range,
        count: range.count,
        percentage: range.percentage || 0,
        minValue: range.minValue,
        maxValue: range.maxValue || Infinity,
        sortOrder: investmentSizeData.indexOf(range)
      }))
  }, [investmentSizeData, investmentSizeLoading, investmentSizeError])

  // Transform investment duration data from server-side aggregates to chart format
  const investmentDurationData = useMemo(() => {
    if (investmentDurationLoading || investmentDurationError) {
      return []
    }

    return investmentDurationRawData
      .filter(range => range.count && range.count > 0)
      .map(range => ({
        type: range.range,
        count: range.count,
        percentage: range.percentage || 0,
        minValue: range.minYears,
        maxValue: range.maxYears || Infinity,
        sortOrder: investmentDurationRawData.indexOf(range)
      }))
  }, [investmentDurationRawData, investmentDurationLoading, investmentDurationError])

  return (
    <>
      {/* Role Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Role Distribution by Count (${roleCountCurrency})`}
          description="Distribution of equity positions by role"
          icon={ChartPieSliceIcon}
          iconVariant="default"
          data={roleCountData}
          valueType="count"
          currency={roleCountCurrency}
          onCurrencyChange={setRoleCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
          isLoading={roleCountLoading}
          error={roleCountError}
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
          isLoading={roleAmountLoading}
          error={roleAmountError}
        />
      </div>

      {/* Status Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Status Distribution by Count (${statusCountCurrency})`}
          description="Distribution by investment status"
          icon={ChartDonutIcon}
          iconVariant="default"
          data={statusCountData}
          valueType="count"
          currency={statusCountCurrency}
          onCurrencyChange={setStatusCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
          isLoading={statusCountLoading}
          error={statusCountError}
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
          isLoading={statusAmountLoading}
          error={statusAmountError}
        />
      </div>

      {/* Stake Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Stake Type Distribution by Count (${stakeTypeCountCurrency})`}
          description="Distribution by stake type"
          icon={PercentIcon}
          iconVariant="success"
          data={stakeTypeCountData}
          valueType="count"
          currency={stakeTypeCountCurrency}
          onCurrencyChange={setStakeTypeCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
          isLoading={stakeTypeCountLoading}
          error={stakeTypeCountError}
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
          isLoading={stakeTypeAmountLoading}
          error={stakeTypeAmountError}
        />
      </div>

      {/* Investment Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title={`Investment Type Distribution by Count (${investmentTypeCountCurrency})`}
          description="Distribution by investment type classification"
          icon={ChartPieSliceIcon}
          iconVariant="secondary"
          data={investmentTypeCountData}
          valueType="count"
          currency={investmentTypeCountCurrency}
          onCurrencyChange={setInvestmentTypeCountCurrency}
          availableCurrencies={currencyOptionsWithAll}
          isLoading={investmentTypeCountLoading}
          error={investmentTypeCountError}
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
          isLoading={investmentTypeAmountLoading}
          error={investmentTypeAmountError}
        />
      </div>

      {/* Investment Size & Duration Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <InvestmentSizeChart
          data={transformedInvestmentSizeData}
          currency={investmentSizeCurrency}
          onCurrencyChange={setInvestmentSizeCurrency}
          availableCurrencies={availableCurrencies}
          isLoading={investmentSizeLoading}
          error={investmentSizeError}
        />
        <InvestmentDurationChart
          data={investmentDurationData}
          currency={investmentDurationCurrency}
          onCurrencyChange={setInvestmentDurationCurrency}
          availableCurrencies={availableCurrencies}
          isLoading={investmentDurationLoading}
          error={investmentDurationError}
        />
      </div>
    </>
  )
}
