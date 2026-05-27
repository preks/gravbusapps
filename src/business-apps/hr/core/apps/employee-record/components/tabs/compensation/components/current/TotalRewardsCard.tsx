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
import { CompensationData } from '../../types/compensationTypes'
import { formatCurrencyString } from '@/common/utils/numberFormatter'

interface TotalRewardsCardProps {
  t: (key: string, params?: any) => string
  compensationData: CompensationData
  loading: boolean
  locale: string
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
const TotalRewardsCard: React.FC<TotalRewardsCardProps> = ({ t, compensationData, loading, locale }) => {
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
        label: t('rewards-base-salary')
      })
    }

    if (bonuses > 0) {
      categories.push({
        name: 'bonuses',
        value: bonuses,
        percentage: (bonuses / total) * 100,
        fill: 'var(--color-bonuses)',
        label: t('rewards-bonuses-ytd')
      })
    }

    if (benefitsValue > 0) {
      categories.push({
        name: 'benefits',
        value: benefitsValue,
        percentage: (benefitsValue / total) * 100,
        fill: 'var(--color-benefits)',
        label: t('rewards-benefits')
      })
    }

    if (stockOptions > 0) {
      categories.push({
        name: 'stocks',
        value: stockOptions,
        percentage: (stockOptions / total) * 100,
        fill: 'var(--color-stocks)',
        label: t('rewards-stock-options')
      })
    }

    return categories
  }, [compensationData, t])

  const totalRewards = useMemo(() => {
    return rewardsData.reduce((sum, category) => sum + category.value, 0)
  }, [rewardsData])

  const currencyCode = compensationData.currentCompensation?.currency?.code || 'EUR'

  // Chart configuration - colors are defined in the data, not here
  const chartConfig = useMemo(
    () =>
      ({
        value: { label: 'Amount' },
        salary: { label: t('rewards-base-salary') },
        bonuses: { label: t('rewards-bonuses-ytd') },
        benefits: { label: t('rewards-benefits') },
        stocks: { label: t('rewards-stock-options') }
      }) satisfies ChartConfig,
    [t]
  )

  // Custom label for pie chart - show label and percentage
  const renderCustomLabel = (entry: any) => {
    const category = rewardsData.find(c => c.name === entry.name)
    return `${category?.label}\n${entry.percentage.toFixed(1)}%`
  }

  const rewardsCardHeader = (
    <CardHeader>
      <CardTitle>{t('rewards-title')}</CardTitle>
      <CardDescription>{t('rewards-description')}</CardDescription>
    </CardHeader>
  )

  const rewardsPageHeader = (
    <div>
      <h2 className="gba:text-2xl gba:font-bold gba:leading-none gba:tracking-tight gba:text-foreground">
        {t('rewards-title')}
      </h2>
      <p className="gba:mt-1.5 gba:text-sm gba:text-muted-foreground">{t('rewards-description')}</p>
    </div>
  )

  if (loading) {
    return (
      <Card data-testid="total-rewards-card">
        {rewardsCardHeader}
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <div className="gba:text-center gba:text-muted-foreground">{t('rewards-loading')}</div>
        </CardContent>
      </Card>
    )
  }

  if (rewardsData.length === 0) {
    return (
      <Card data-testid="total-rewards-card">
        {rewardsCardHeader}
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <div className="gba:text-center gba:text-muted-foreground">No compensation data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="total-rewards-card">
      {/* Header Section */}
      {rewardsPageHeader}

      {/* Two Cards Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        {/* LEFT CARD - Compensation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('rewards-breakdown-title')}</CardTitle>
            <CardDescription>{t('rewards-breakdown-description')}</CardDescription>
            <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
              <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('rewards-total-annual-value')}</div>
              <div className="gba:text-3xl gba:font-bold gba:text-foreground">
                {formatCurrencyString(totalRewards, {
                  currency: currencyCode,
                  locale: locale,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
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
                      {formatCurrencyString(category.value, {
                        currency: currencyCode,
                        locale: locale,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
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
            <CardTitle>{t('rewards-visual-breakdown')}</CardTitle>
            <CardDescription>{t('rewards-visual-description')}</CardDescription>
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
                                {formatCurrencyString(Number(value), {
                                  currency: currencyCode,
                                  locale: locale,
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })}{' '}
                                ({category?.percentage.toFixed(1)}%)
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
      <div className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('rewards-package-description')}</div>
    </div>
  )
}

export default TotalRewardsCard
