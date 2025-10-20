import React, { useState, useMemo, useEffect } from 'react'
import { ChartPieSliceIcon, ChartDonutIcon, PercentIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { EquityInvestmentSummary } from '../../shared/types'
import { DistributionPieChart } from './shared/DistributionPieChart'
import { InvestmentSizeChart, InvestmentDurationChart } from './shared/InvestmentSizeDurationCharts'
import {
  computeDistributionByField,
  calculateInvestmentSizeRanges,
  calculateInvestmentDurationRanges
} from './shared/distributionUtils'

interface EquityDistributionChartsProps {
  roleData: any[]
  statusData: any[]
  stakeTypeData: any[]
  investmentTypeData: any[]
  rawInvestments: EquityInvestmentSummary[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const EquityDistributionCharts: React.FC<EquityDistributionChartsProps> = ({
  roleData,
  statusData,
  stakeTypeData,
  investmentTypeData,
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Independent currency state for each chart
  const [roleCurrency, setRoleCurrency] = useState(masterCurrency)
  const [statusCurrency, setStatusCurrency] = useState(masterCurrency)
  const [stakeTypeCurrency, setStakeTypeCurrency] = useState(masterCurrency)
  const [investmentTypeCurrency, setInvestmentTypeCurrency] = useState(masterCurrency)
  const [investmentSizeCurrency, setInvestmentSizeCurrency] = useState(masterCurrency)

  // Reset all chart currencies when master currency changes
  useEffect(() => {
    setRoleCurrency(masterCurrency)
    setStatusCurrency(masterCurrency)
    setStakeTypeCurrency(masterCurrency)
    setInvestmentTypeCurrency(masterCurrency)
    setInvestmentSizeCurrency(masterCurrency)
  }, [masterCurrency])

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

  // Transform data for pie charts - Role
  const roleCountData = useMemo(
    () =>
      roleData.map(item => ({
        type: item.type,
        count: item.count
      })),
    [roleData]
  )

  const roleAmountData = useMemo(() => {
    return computeDistributionByField(rawInvestments, roleCurrency, equity => {
      const roles = equity.investment.investmentRole || []
      return roles.length > 0 && roles[0]?.investmentRole?.value ? roles[0].investmentRole.value : 'Unknown'
    })
  }, [rawInvestments, roleCurrency])

  // Transform data for pie charts - Status
  const statusCountData = useMemo(
    () =>
      statusData.map(item => ({
        type: item.type,
        count: item.count
      })),
    [statusData]
  )

  const statusAmountData = useMemo(() => {
    return computeDistributionByField(
      rawInvestments,
      statusCurrency,
      equity => equity.investment.investmentStatus?.value || 'Unknown'
    )
  }, [rawInvestments, statusCurrency])

  // Transform data for pie charts - Stake Type
  const stakeTypeCountData = useMemo(
    () =>
      stakeTypeData.map(item => ({
        type: item.type,
        count: item.count
      })),
    [stakeTypeData]
  )

  const stakeTypeAmountData = useMemo(() => {
    return computeDistributionByField(
      rawInvestments,
      stakeTypeCurrency,
      equity => equity.investment.investmentStakeType?.value || 'Unknown'
    )
  }, [rawInvestments, stakeTypeCurrency])

  // Transform data for pie charts - Investment Type
  const investmentTypeCountData = useMemo(
    () =>
      investmentTypeData.map(item => ({
        type: item.type,
        count: item.count
      })),
    [investmentTypeData]
  )

  const investmentTypeAmountData = useMemo(() => {
    return computeDistributionByField(
      rawInvestments,
      investmentTypeCurrency,
      equity => equity.investment.investmentType?.value || 'Unknown'
    )
  }, [rawInvestments, investmentTypeCurrency])

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
          title="Role Distribution by Count"
          description="Distribution of equity positions by role"
          icon={ChartPieSliceIcon}
          iconVariant="default"
          data={roleCountData}
          valueType="count"
        />
        <DistributionPieChart
          title={`Role Distribution by Total Amount (${roleCurrency})`}
          description="Total amount by role"
          icon={CurrencyCircleDollarIcon}
          iconVariant="secondary"
          data={roleAmountData}
          valueType="amount"
          currency={roleCurrency}
          onCurrencyChange={setRoleCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Status Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title="Status Distribution by Count"
          description="Distribution by investment status"
          icon={ChartDonutIcon}
          iconVariant="default"
          data={statusCountData}
          valueType="count"
        />
        <DistributionPieChart
          title={`Status Distribution by Total Amount (${statusCurrency})`}
          description="Total amount by status"
          icon={CurrencyCircleDollarIcon}
          iconVariant="secondary"
          data={statusAmountData}
          valueType="amount"
          currency={statusCurrency}
          onCurrencyChange={setStatusCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Stake Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title="Stake Type Distribution by Count"
          description="Distribution by stake type"
          icon={PercentIcon}
          iconVariant="success"
          data={stakeTypeCountData}
          valueType="count"
        />
        <DistributionPieChart
          title={`Stake Type Distribution by Total Amount (${stakeTypeCurrency})`}
          description="Total amount by stake type"
          icon={CurrencyCircleDollarIcon}
          iconVariant="warning"
          data={stakeTypeAmountData}
          valueType="amount"
          currency={stakeTypeCurrency}
          onCurrencyChange={setStakeTypeCurrency}
          availableCurrencies={availableCurrencies}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Investment Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <DistributionPieChart
          title="Investment Type Distribution by Count"
          description="Distribution by investment type classification"
          icon={ChartPieSliceIcon}
          iconVariant="secondary"
          data={investmentTypeCountData}
          valueType="count"
        />
        <DistributionPieChart
          title={`Investment Type Distribution by Total Amount (${investmentTypeCurrency})`}
          description="Total amount by investment type"
          icon={CurrencyCircleDollarIcon}
          iconVariant="default"
          data={investmentTypeAmountData}
          valueType="amount"
          currency={investmentTypeCurrency}
          onCurrencyChange={setInvestmentTypeCurrency}
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
