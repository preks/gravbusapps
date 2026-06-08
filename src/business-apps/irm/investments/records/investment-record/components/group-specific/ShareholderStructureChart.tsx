import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  Alert,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { PencilIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetInvestmentShareholdersByInvestmentId } from '@/common/data/investment/hooks/useInvestmentShareholders'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface ShareholderStructureChartProps extends BusinessAppContextProps {
  investment: any
}

interface ShareholderChartData {
  name: string // Key for chart (e.g., "company-a")
  displayName: string // Display name (e.g., "Company A")
  value: number // Percentage value
  fill: string // CSS variable color
}

export const ShareholderStructureChart: React.FC<ShareholderStructureChartProps> = props => {
  const { investment } = props
  const [shareholderData, setShareholderData] = useState<ShareholderChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentShareholders } = useGetInvestmentShareholdersByInvestmentId(props)

  // Helper function to convert name to key
  const toKey = (value: string): string =>
    value
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9-]/g, '')

  // Load shareholder data function
  const loadShareholderData = async () => {
    if (!investment?.id) {
      setIsLoading(false)
      return
    }

    if (!hasLoadedRef.current) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await fetchInvestmentShareholders(investment.id)
      const shareholders = result.shareholders || []

      // Transform shareholder data for the chart with keys
      const chartData = shareholders
        .filter(s => s.stakePercentage && s.stakePercentage > 0)
        .map((shareholder, index) => {
          const displayName = shareholder.name || `Shareholder ${index + 1}`
          const key = toKey(displayName)
          return {
            name: key, // Use key instead of display name
            displayName: displayName, // Store display name separately
            value: Number(shareholder.stakePercentage) || 0,
            fill: `var(--color-${key})` // Use CSS variable format
          }
        })

      // Calculate total percentage
      const totalPercentage = chartData.reduce((sum, item) => sum + item.value, 0)

      // Always ensure total is 100%
      // If no shareholders or total is less than 100%, add "Unknown" category for the difference
      if (totalPercentage < 100) {
        const unknownPercentage = 100 - Math.max(totalPercentage, 0)
        if (unknownPercentage > 0) {
          const unknownLabel = getTranslationFromI18nKeyAndLabel(
            'crm.investments.analytics.shareholderStructure.unknown',
            'Unknown'
          )
          chartData.push({
            name: 'unknown', // Use key
            displayName: unknownLabel, // Store display name
            value: unknownPercentage,
            fill: 'var(--color-unknown)' // Use CSS variable format
          })
        }
      }

      setShareholderData(chartData)
    } catch (err) {
      console.error('Error loading shareholder data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shareholder data')
    } finally {
      hasLoadedRef.current = true
      setIsLoading(false)
    }
  }

  useEffect(() => {
    hasLoadedRef.current = false
  }, [investment?.id])

  // Load shareholder data on component mount
  useEffect(() => {
    loadShareholderData()
  }, [investment?.id])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {
      value: { label: 'Share %' } // Data dimension
    }

    // Add visual categories with their display labels
    for (const shareholder of shareholderData) {
      config[shareholder.name] = {
        label: shareholder.displayName
      }
    }

    return config
  }, [shareholderData])

  // Custom tooltip for pie chart
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload[0]
      const displayName = data.payload.displayName || data.name
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-lg">
          <div className="gba:mb-2 gba:font-medium gba:text-foreground">{displayName}</div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: data.payload.fill }} />
            <span className="gba:font-semibold gba:text-sm">{data.value.toFixed(2)}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  // Render chart content based on current state
  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-[350px]">
          <Spinner size="lg" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" data-testid="shareholder-error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    return (
      <ChartContainer config={chartConfig} className="gba:h-[350px] gba:w-full">
        <PieChart>
          <Pie
            data={shareholderData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={entry => `${entry.displayName}: ${entry.value.toFixed(2)}%`}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
          >
            {shareholderData.map(entry => (
              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip content={customTooltip} />
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
      </ChartContainer>
    )
  }

  return (
    <Card data-testid="shareholder-structure-chart" className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex-1">
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.shareholderStructure.title',
                'Shareholder Structure'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.shareholderStructure.description',
                'Distribution of ownership across shareholders'
              )}
            </CardDescription>
          </div>
          <AppAction
            contextsArray={[FlowContextName.investmentShareholderUpdate]}
            externalContextData={{ investmentId: investment?.id }}
            accessToken={props.accessToken}
            onProcessComplete={loadShareholderData}
            emptyStateBehavior="hide"
            data-testid="shareholder-manage-action"
          >
            <Button
              size="sm"
              variant="default"
              type="button"
              data-testid="shareholder-update-chart-button"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <PencilIcon size={16} />
              {getTranslationFromI18nKeyAndLabel('crm.investments.shareholders.updateChart', 'Update Chart')}
            </Button>
          </AppAction>
        </div>
      </CardHeader>
      <CardContent>{renderChartContent()}</CardContent>
    </Card>
  )
}

export default ShareholderStructureChart
