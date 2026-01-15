import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Target } from 'lucide-react'
import { RatingsTab } from './components/tabs/RatingsTab'
import { StatusesTab } from './components/tabs/StatusesTab'
import { SourcesTab } from './components/tabs/SourcesTab'

export enum LeadDataTabs {
  RATINGS = 'ratings',
  STATUSES = 'statuses',
  SOURCES = 'sources'
}

export interface LeadDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'LeadData'

const LeadData: React.FC<LeadDataProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(LeadDataTabs.RATINGS)

  // Get sourceApp from URL params - required for this app to work
  const urlParams = new URLSearchParams(window.location.search)
  const sourceApp = urlParams.get('sourceApp')

  // Validate sourceApp parameter
  useEffect(() => {
    if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
      console.error('LeadData requires sourceApp parameter (CRM or IRM)')
    }
  }, [sourceApp])

  // Handle tab changes from URL hash or query params
  useEffect(() => {
    const handleLocationChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      const hashTab = window.location.hash.replace('#', '')

      const tab = tabParam || hashTab
      if (tab && Object.values(LeadDataTabs).includes(tab as LeadDataTabs)) {
        setActiveTab(tab as LeadDataTabs)
      }
    }

    handleLocationChange()
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const handleTabChange = (key: string) => {
    setActiveTab(key as LeadDataTabs)

    // Update URL with new tab
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    url.hash = key
    window.history.pushState({}, '', url.toString())
  }

  // Show error if sourceApp is missing
  if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
    return (
      <div
        className={`gba:w-full gba:h-full ${className || ''}`}
        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
      >
        <PageHeader
          title={t('mdm.lead_data', 'Lead Data')}
          subtitle={t('mdm.lead_data.description', 'Manage lead ratings, statuses, and sources')}
          avatar={<Target className="gba:h-5 gba:w-5" />}
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Header`}
        />
        <div className="gba:p-6">
          <div className="gba:mt-6">
            <Alert className="gba:border-red-200 gba:bg-red-50">
              <AlertDescription>
                {t(
                  'mdm.lead_data.source_app_required',
                  'This application requires a sourceApp parameter (CRM or IRM) to function properly.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`gba:w-full gba:h-full ${className || ''}`}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
    >
      <PageHeader
        title={t('mdm.lead_data', 'Lead Data')}
        subtitle={t('mdm.lead_data.description', 'Manage lead ratings, statuses, and sources')}
        avatar={<Target className="gba:h-5 gba:w-5" />}
        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Header`}
      />
      <div className="gba:p-6">
        <div className="gba:mt-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}
          >
            <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
              <TabsTrigger value={LeadDataTabs.RATINGS}>{t('mdm.lead_ratings', 'Ratings')}</TabsTrigger>
              <TabsTrigger value={LeadDataTabs.STATUSES}>{t('mdm.lead_statuses', 'Statuses')}</TabsTrigger>
              <TabsTrigger value={LeadDataTabs.SOURCES}>{t('mdm.lead_sources', 'Sources')}</TabsTrigger>
            </TabsList>

            <TabsContent value={LeadDataTabs.RATINGS} className="gba:mt-6">
              <RatingsTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>

            <TabsContent value={LeadDataTabs.STATUSES} className="gba:mt-6">
              <StatusesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>

            <TabsContent value={LeadDataTabs.SOURCES} className="gba:mt-6">
              <SourcesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default LeadData
export { LeadData }
