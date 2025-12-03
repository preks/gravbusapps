import React from 'react'
import { Button, Alert, AlertTitle, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BarChart3, Home, Banknote } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentStatistics } from './components/InvestmentStatistics'
import InvestmentBreakdownCard, { type InvestmentGroup, type TrendData } from './components/InvestmentBreakdownCard'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { Investment } from '@/common/data/investment/types/investmentTypes'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useInvestmentGroupsAndTypes } from './hooks/useInvestmentGroupsAndTypes'
import { CurrencyFilter } from '../analytics-view/shared/components'

interface DashboardViewProps extends BusinessAppContextProps {
  moduleColor?: string
  onNavigateToInvestments?: (subTab?: string) => void
}

// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  if (groupName === 'RealEstate') {
    return 'Real Estate'
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund'
  }
  return groupName.replace(/([A-Z])/g, ' $1').trim()
}

// Helper function to get icon component by name
const getIconComponent = (groupName: string) => {
  const groupLower = groupName.toLowerCase()

  if (groupLower.includes('equity') && !groupLower.includes('private')) {
    return BarChart3
  } else if (groupLower.includes('real') || groupLower.includes('estate')) {
    return Home
  } else if (groupLower.includes('liquid') || groupLower.includes('fund')) {
    return Banknote
  } else {
    return BarChart3
  }
}

// Helper function to calculate trend data
// Compares current total investment vs total investment 91 days ago (based on createdAt)
const calculateTrendData = (investments: Investment[]): TrendData => {
  const now = new Date()
  const quarterAgo = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000)

  // Current total: all investments
  const currentTotal = investments.reduce((sum, inv) => sum + (inv.totalInvestmentAmount || 0), 0)

  // Previous total: investments that existed 91 days ago (created before 91 days ago)
  const previousTotal = investments
    .filter(inv => {
      if (!inv.createdAt) return true // Include if no createdAt (assume old)
      const createdDate = new Date(inv.createdAt)
      return createdDate < quarterAgo
    })
    .reduce((sum, inv) => sum + (inv.totalInvestmentAmount || 0), 0)

  // If no previous data, check if we have current data
  if (previousTotal === 0) {
    return {
      percentage: currentTotal > 0 ? 100 : 0,
      trend: currentTotal > 0 ? 'up' : 'neutral'
    }
  }

  // Calculate percentage change
  const percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100

  // If change is negligible, show as neutral
  if (Math.abs(percentageChange) < 0.1) {
    return { percentage: 0, trend: 'neutral' }
  }

  // Cap extreme percentages
  if (Math.abs(percentageChange) >= 1000) {
    return {
      percentage: 1000,
      trend: percentageChange > 0 ? 'up' : 'down'
    }
  }

  return {
    percentage: Math.abs(percentageChange),
    trend: percentageChange > 0 ? 'up' : 'down'
  }
}

/**
 * Main dashboard component for IRM Investments management
 * Provides overview of all investments with filtering, sorting, and metrics
 */
const DashboardView: React.FC<DashboardViewProps> = ({
  accessToken,
  userInfo,
  moduleColor,
  onNavigateToInvestments
}) => {
  const handleNavigateToInvestmentType = (investmentType: string) => {
    if (onNavigateToInvestments) {
      onNavigateToInvestments(investmentType)
    }
  }

  // Use centralized investment data
  const { fetchInvestments } = useGetInvestments({ accessToken, userInfo })
  const [investments, setInvestments] = React.useState<Investment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [masterCurrency, setMasterCurrency] = React.useState<string>('EUR')

  // Fetch available currencies efficiently using distinctOn (code-only format)
  const { currencies: availableCurrencies } = useAvailableCurrencies(
    { accessToken, userInfo },
    {
      filters: { entity: 'Investment' },
      returnFormat: 'codes'
    }
  )

  // Use centralized groups and types data
  const { data: groupsData, error: groupsError, isLoading: groupsLoading } = useInvestmentGroupsAndTypes(accessToken)

  // Fetch ALL investments once (cards can filter by their individual currency)
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setIsLoading(true)
        // Fetch ALL investments - cards will do their own currency filtering
        const result = await fetchInvestments({
          limit: 1000
        })
        if (!mounted) return

        setInvestments(result?.Investment || [])
        setError(null)
      } catch (err) {
        if (!mounted) return
        console.error('Error fetching investments:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [fetchInvestments])

  // Map investment types to their parent groups
  const typeToGroupMap = React.useMemo(() => {
    const map = new Map<string, string>()

    if (groupsData?.groups?.length) {
      groupsData.groups.forEach((group: any) => {
        group.types?.forEach((type: any) => {
          map.set(type.value, group.value)
        })
      })
    }

    return map
  }, [groupsData])

  // Process investments by groups
  const processedInvestmentGroups = React.useMemo(() => {
    if (!investments?.length || !groupsData?.groups?.length) {
      return []
    }

    const groupGroups = investments.reduce(
      (groups, inv) => {
        const investmentTypeValue = inv.investmentType?.value
        const actualGroupValue = inv.investmentGroup?.value

        const correctGroupValue = investmentTypeValue ? typeToGroupMap.get(investmentTypeValue) : null
        const finalGroupValue = correctGroupValue || actualGroupValue

        if (!finalGroupValue) {
          console.warn('Investment without proper type or group found:', {
            id: inv.id,
            name: inv.name,
            investmentType: investmentTypeValue,
            investmentGroup: actualGroupValue
          })
          return groups
        }

        if (actualGroupValue && correctGroupValue && actualGroupValue !== correctGroupValue) {
          console.warn(
            `Investment data mismatch: "${inv.name}" assigned to "${actualGroupValue}" but type "${investmentTypeValue}" belongs to "${correctGroupValue}" per catalog. Using catalog group.`
          )
        } else if (!investmentTypeValue && actualGroupValue) {
          console.info(`Investment "${inv.name}" has no type, using assigned group "${actualGroupValue}"`)
        }

        if (!groups[finalGroupValue]) groups[finalGroupValue] = []
        groups[finalGroupValue].push(inv)
        return groups
      },
      {} as Record<string, Investment[]>
    )

    const groupOrder = ['RealEstate', 'Equity', 'Liquid Fund', 'Liquid Funds']

    groupsData.groups.forEach((catalogGroup: any) => {
      if (!groupGroups[catalogGroup.value]) {
        groupGroups[catalogGroup.value] = []
      }
    })

    return Object.entries(groupGroups)
      .sort(([groupA], [groupB]) => {
        const indexA = groupOrder.indexOf(groupA)
        const indexB = groupOrder.indexOf(groupB)

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return groupA.localeCompare(groupB)
      })
      .map(([group, groupInvestments]) => ({
        group,
        investments: groupInvestments
      }))
  }, [investments, groupsData, typeToGroupMap])

  // Transform investments into grouped metrics
  const investmentGroupMetrics = React.useMemo(() => {
    if (!groupsData?.groups?.length || !investments?.length) {
      return []
    }

    return processedInvestmentGroups.map(({ group, investments: groupInvestments }) => {
      return {
        name: group,
        icon: getIconComponent(group),
        investments: groupInvestments.length,
        groupInvestments // Include actual investments for currency filtering and trend calculation
      }
    })
  }, [processedInvestmentGroups])

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="dashboard-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || groupsError) {
    return (
      <Alert variant="destructive" data-testid="dashboard-error">
        <AlertTitle>Error Loading Investment Data</AlertTitle>
        <AlertDescription>{error || groupsError}</AlertDescription>
        <button
          className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </Alert>
    )
  }

  return (
    <div data-testid="dashboard-content">
      {/* Header with Currency Filter */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900 gba:m-0">
          {getTranslationFromI18nKeyAndLabel('dashboard.title', 'Investment Dashboard')}
        </h1>
        <CurrencyFilter
          value={masterCurrency}
          onChange={setMasterCurrency}
          currencies={availableCurrencies}
          dataTestId="dashboard-master-currency-filter"
        />
      </div>

      {/* Key Metrics Cards */}
      <div className="gba:mb-8">
        <InvestmentStatistics accessToken={accessToken} userInfo={userInfo} selectedCurrency={masterCurrency} />
      </div>

      {/* Investment Groups Breakdown */}
      <div className="gba:space-y-6">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Groups</h2>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {investments.length} total investments across {groupsData?.groups?.length ?? 0} groups
            </p>
          </div>
        </div>

        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3">
          {groupsLoading ? (
            <div className="gba:col-span-full gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner size="lg" />
            </div>
          ) : groupsError ? (
            <div className="gba:col-span-full">
              <Alert variant="destructive">
                <AlertTitle>Error Loading Investment Groups</AlertTitle>
                <AlertDescription>{groupsError}</AlertDescription>
                <Button size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </Alert>
            </div>
          ) : investmentGroupMetrics.length === 0 ? (
            <div className="gba:col-span-full gba:text-center gba:py-8">
              <p className="gba:text-gray-500">No investment groups found</p>
              <p className="gba:text-sm gba:text-gray-400 gba:mt-2">
                {investments.length} investments available, {groupsData?.groups?.length ?? 0} groups in catalog
              </p>
            </div>
          ) : (
            investmentGroupMetrics.map((group: InvestmentGroup) => (
              <InvestmentBreakdownCard
                key={group.name}
                group={group}
                moduleColor={
                  moduleColor as 'ext1' | 'ext2' | 'ext3' | 'ext4' | 'ext5' | 'ext6' | 'ext7' | 'ext8' | undefined
                }
                onNavigateToInvestmentType={handleNavigateToInvestmentType}
                formatGroupName={formatGroupName}
                calculateTrendData={calculateTrendData}
                masterCurrency={masterCurrency}
                availableCurrencies={availableCurrencies}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardView
