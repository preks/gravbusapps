import React, { useState, useEffect, useMemo } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { DollarSign, Target, TrendingDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { extractAvailableCurrencies } from '@/common/utils/numberFormatter'
import PlannedExits from './tabs/planned-exits'
import { ExitOpportunitiesTab } from './tabs/exit-opportunities'
import { SalesTab } from './tabs/sales'

export type DivestmentViewProps = BusinessAppContextProps

export const DivestmentView: React.FC<DivestmentViewProps> = context => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')
  const [investmentsForCurrency, setInvestmentsForCurrency] = useState<any[]>([])

  const { fetchInvestments } = useGetInvestments(context)

  // Load investments to extract available currencies
  useEffect(() => {
    const loadInvestments = async () => {
      if (!context.accessToken) return

      try {
        const response = await fetchInvestments({ limit: 1000, offset: 0 })
        setInvestmentsForCurrency(response?.Investment || [])
      } catch (err) {
        console.error('Error loading investments for currency extraction:', err)
      }
    }

    loadInvestments()
  }, [context.accessToken, fetchInvestments])

  // Extract unique currencies from investments
  const availableCurrencies = useMemo(() => {
    const currencies = extractAvailableCurrencies(investmentsForCurrency, inv => inv.currency?.id)

    // Sort with EUR first, then alphabetically
    const sorted = currencies.sort((a, b) => {
      if (a === 'EUR') return -1
      if (b === 'EUR') return 1
      return a.localeCompare(b)
    })

    return sorted.length > 0 ? sorted : ['EUR']
  }, [investmentsForCurrency])

  const tabOptions = [
    {
      key: 'planned-exits',
      icon: <TrendingDown />,
      label: getTranslationFromI18nKeyAndLabel('planned_exits', 'Planned Exits')
    },
    {
      key: 'exit-opportunities',
      icon: <Target />,
      label: getTranslationFromI18nKeyAndLabel('exit_opportunities', 'Exit Opportunities')
    },
    {
      key: 'sales',
      icon: <DollarSign />,
      label: getTranslationFromI18nKeyAndLabel('sales', 'Sales')
    }
  ]

  // Get initial tab from URL or default to first tab
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')

    if (tabFromUrl && tabOptions.some(option => option.key === tabFromUrl)) {
      return tabFromUrl
    }

    return tabOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab())

  // Update URL when tab changes
  const updateUrl = (tab: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', tab)

    try {
      const params: Record<string, string> = {}
      urlParams.forEach((value, key) => {
        params[key] = value
      })

      const newUrl = buildPlatformUrl(window.location.pathname, params)

      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', newUrl)
      }
    } catch (error) {
      console.warn('Failed to update URL in divestment view:', error)
    }
  }

  const handleTabChange = (key: string) => {
    if (!key || key === activeTab) {
      return
    }
    setActiveTab(key)
    updateUrl(key)
  }

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab)
    }
  }, [])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveTab(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div data-testid="divestment-relations-tabs" className="gba:h-full gba:flex gba:flex-col">
      {/* Header with Currency Filter */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Divestment Management</h1>
            <p className="gba:text-gray-600">Track and manage planned exits, opportunities, and completed sales</p>
          </div>

          {/* Currency Filter - Top Right */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-700">Currency:</span>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="gba:w-[120px]" data-testid="divestment-view-currency-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full gba:flex gba:flex-col">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
          {tabOptions.map(option => (
            <TabsTrigger
              key={option.key}
              value={option.key}
              startIcon={option.icon}
              data-testid={`divestment-tab-${option.key}`}
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="planned-exits"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="planned-exits-tab-content"
        >
          <div className="gba:p-6">
            <PlannedExits {...context} currencyCode={selectedCurrency} />
          </div>
        </TabsContent>

        <TabsContent
          value="exit-opportunities"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="exit-opportunities-tab-content"
        >
          <div className="gba:p-6">
            <ExitOpportunitiesTab {...context} currencyCode={selectedCurrency} />
          </div>
        </TabsContent>

        <TabsContent value="sales" className="gba:flex-1 gba:overflow-auto gba:mt-0" data-testid="sales-tab-content">
          <div className="gba:p-6">
            <SalesTab {...context} currencyCode={selectedCurrency} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DivestmentView
