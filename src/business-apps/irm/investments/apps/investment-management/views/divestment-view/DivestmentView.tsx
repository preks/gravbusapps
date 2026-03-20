import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { CurrencyDollarIcon, TargetIcon, TrendDownIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import PlannedExits from './tabs/planned-exits'
import { ExitOpportunitiesTab } from './tabs/exit-opportunities'
import { ExitsTab } from './tabs/exits'

export type DivestmentViewProps = BusinessAppContextProps

export const DivestmentView: React.FC<DivestmentViewProps> = context => {
  const tabOptions = [
    {
      key: 'planned-exits',
      icon: <TrendDownIcon />,
      label: getTranslationFromI18nKeyAndLabel('planned_exits', 'Planned Exits')
    },
    {
      key: 'exit-opportunities',
      icon: <TargetIcon />,
      label: getTranslationFromI18nKeyAndLabel('exit_opportunities', 'Exit Opportunities')
    },
    {
      key: 'exits',
      icon: <CurrencyDollarIcon />,
      label: getTranslationFromI18nKeyAndLabel('exits', 'Exits')
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

      if (globalThis.window?.history?.replaceState) {
        globalThis.window.history.replaceState({}, '', newUrl)
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

    globalThis.window?.addEventListener('popstate', handlePopState)
    return () => globalThis.window?.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div data-testid="divestment-relations-tabs" className="gba:h-full gba:flex gba:flex-col">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:mb-4">
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Divestment Management</h1>
          <p className="gba:text-gray-600">Track and manage planned exits, opportunities, and completed exits</p>
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
            <PlannedExits {...context} enabled={activeTab === 'planned-exits'} />
          </div>
        </TabsContent>

        <TabsContent
          value="exit-opportunities"
          className="gba:flex-1 gba:overflow-auto gba:mt-0"
          data-testid="exit-opportunities-tab-content"
        >
          <div className="gba:p-6">
            <ExitOpportunitiesTab {...context} enabled={activeTab === 'exit-opportunities'} />
          </div>
        </TabsContent>

        <TabsContent value="exits" className="gba:flex-1 gba:overflow-auto gba:mt-0" data-testid="exits-tab-content">
          <div className="gba:p-6">
            <ExitsTab {...context} enabled={activeTab === 'exits'} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DivestmentView
