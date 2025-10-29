'use client'

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie, ResponsiveContainer } from 'recharts'
import { CompensationData } from '../../../types/compensationTypes'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface TotalRewardsCardProps {
  compensationData: CompensationData
  loading: boolean
}

interface RewardCategory {
  name: string
  value: number
  percentage: number
  fill: string // Color for pie chart
  label: string
  [key: string]: string | number // Index signature for chart compatibility
}

/**
 * Total Rewards 360° View Component
 * Interactive pie chart showing complete compensation package breakdown
 */
const TotalRewardsCard: React.FC<TotalRewardsCardProps> = ({ compensationData, loading }) => {
  // Format currency for display
  const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate total rewards breakdown
  const rewardsData = useMemo((): RewardCategory[] => {
    const { currentCompensation, totalBonusesYTD, benefits } = compensationData

    const baseSalary = currentCompensation?.baseSalary || 0
    const bonuses = totalBonusesYTD || 0
    const benefitsValue = benefits.reduce((sum, benefit) => sum + (benefit.yearlyAmount || 0), 0)
    const stockOptions = currentCompensation?.stockOptions || 0

    const total = baseSalary + bonuses + benefitsValue + stockOptions

    if (total === 0) return []

    const categories: RewardCategory[] = []

    if (baseSalary > 0) {
      categories.push({
        name: 'salary',
        value: baseSalary,
        percentage: (baseSalary / total) * 100,
        fill: 'var(--color-salary)',
        label: 'Base Salary'
      })
    }

    if (bonuses > 0) {
      categories.push({
        name: 'bonuses',
        value: bonuses,
        percentage: (bonuses / total) * 100,
        fill: 'var(--color-bonuses)',
        label: 'Bonuses (YTD)'
      })
    }

    if (benefitsValue > 0) {
      categories.push({
        name: 'benefits',
        value: benefitsValue,
        percentage: (benefitsValue / total) * 100,
        fill: 'var(--color-benefits)',
        label: 'Benefits'
      })
    }

    if (stockOptions > 0) {
      categories.push({
        name: 'stocks',
        value: stockOptions,
        percentage: (stockOptions / total) * 100,
        fill: 'var(--color-stocks)',
        label: 'Stock Options'
      })
    }

    return categories
  }, [compensationData])

  const totalRewards = useMemo(() => {
    return rewardsData.reduce((sum, category) => sum + category.value, 0)
  }, [rewardsData])

  const currencyCode = compensationData.currentCompensation?.currency?.code || 'EUR'

  // Chart configuration - colors are defined in the data, not here
  const chartConfig = useMemo(
    () =>
      ({
        value: { label: 'Amount' },
        salary: { label: 'Base Salary' },
        bonuses: { label: 'Bonuses (YTD)' },
        benefits: { label: 'Benefits' },
        stocks: { label: 'Stock Options' }
      }) satisfies ChartConfig,
    []
  )

  // Custom label for pie chart - show label and percentage
  const renderCustomLabel = (entry: any) => {
    const category = rewardsData.find(c => c.name === entry.name)
    return `${category?.label}\n${entry.percentage.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card data-testid="total-rewards-card">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.total_rewards', 'Total Rewards 360°')}
          </CardTitle>
          <CardDescription>Complete compensation package breakdown</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <div className="gba:text-center gba:text-muted-foreground">Loading total rewards...</div>
        </CardContent>
      </Card>
    )
  }

  if (rewardsData.length === 0) {
    return (
      <Card data-testid="total-rewards-card">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.total_rewards', 'Total Rewards 360°')}
          </CardTitle>
          <CardDescription>Complete compensation package breakdown</CardDescription>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <div className="gba:text-center gba:text-muted-foreground">No compensation data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="total-rewards-card">
      {/* Header Section */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.total_rewards', 'Total Rewards 360°')}
        </h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Complete compensation package breakdown</p>
      </div>

      {/* Two Cards Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        {/* LEFT CARD - Compensation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation Breakdown</CardTitle>
            <CardDescription>Detailed breakdown by category</CardDescription>
            <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Total Annual Value</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {formatCurrency(totalRewards, currencyCode)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:flex-col gba:gap-4">
              {rewardsData.map(category => (
                <div
                  key={category.name}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:hover:bg-accent gba:transition-colors"
                  data-testid={`reward-category-${category.name}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-4 gba:h-4 gba:rounded-full" style={{ backgroundColor: category.fill }} />
                    <div>
                      <div className="gba:font-medium gba:text-foreground">{category.label}</div>
                      <div className="gba:text-sm gba:text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:font-semibold gba:text-foreground">
                      {formatCurrency(category.value, currencyCode)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT CARD - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Breakdown</CardTitle>
            <CardDescription>Compensation distribution chart</CardDescription>
          </CardHeader>
          <CardContent className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
            <ChartContainer config={chartConfig} className="gba:h-[450px] gba:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value: any, name: string) => {
                          const category = rewardsData.find(c => c.name === name)
                          return [
                            <div key={name} className="gba:flex gba:flex-col gba:gap-1">
                              <span className="gba:font-semibold">{category?.label}</span>
                              <span className="gba:text-sm">
                                {formatCurrency(Number(value), currencyCode)} ({category?.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          ]
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  <Pie
                    data={rewardsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    outerRadius="65%"
                    label={renderCustomLabel}
                    labelLine={true}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Footer */}
      <div className="gba:text-sm gba:text-muted-foreground gba:py-2">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:compensation.total_rewards_description',
          'Your total rewards package includes base salary, bonuses, benefits, and stock options'
        )}
      </div>
    </div>
  )
}

export default TotalRewardsCard
