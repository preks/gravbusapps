import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster, useTranslation } from '@newwork/nw-design-system'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BriefcaseIcon } from '@phosphor-icons/react'
import { EmploymentTypesTab } from './components/tabs/EmploymentTypesTab'
import { ContractTypesTab } from './components/tabs/ContractTypesTab'
import translations from './_i18n'

export enum EmploymentDataTabs {
  EMPLOYMENT_TYPES = 'employment-types',
  CONTRACT_TYPES = 'contract-types'
}

export interface EmploymentDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'EmploymentData'

// Helper function to get initial tab from URL
const getInitialTab = (): EmploymentDataTabs => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')

    if (tabParam && Object.values(EmploymentDataTabs).includes(tabParam as EmploymentDataTabs)) {
      return tabParam as EmploymentDataTabs
    }
  }
  return EmploymentDataTabs.EMPLOYMENT_TYPES
}

const EmploymentData: React.FC<EmploymentDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation(translations)
  const [selectedTab, setSelectedTab] = useState<EmploymentDataTabs>(getInitialTab)

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && Object.values(EmploymentDataTabs).includes(tabParam as EmploymentDataTabs)) {
        setSelectedTab(tabParam as EmploymentDataTabs)
      }
    }

    setTabFromUrl()
    window.addEventListener('popstate', setTabFromUrl)
    return () => {
      window.removeEventListener('popstate', setTabFromUrl)
    }
  }, [])

  const onChangeTab = (value: string) => {
    // Update URL with query parameter
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    history.replaceState(null, '', url.toString())
    setSelectedTab(value as EmploymentDataTabs)
  }

  return (
    <PageLayout
      headerIcon={<BriefcaseIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={t('page-title')}
      className={className ?? ''}
      contentContainer={
        <div
          className="gba:box-border gba:h-full gba:min-h-0 gba:w-full gba:overflow-x-hidden gba:overflow-y-auto"
          style={{ padding: '24px' }}
        >
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                <TabsTrigger value={EmploymentDataTabs.EMPLOYMENT_TYPES}>{t('tab-employment-types')}</TabsTrigger>
                <TabsTrigger value={EmploymentDataTabs.CONTRACT_TYPES}>{t('tab-contract-types')}</TabsTrigger>
              </TabsList>

              <TabsContent value={EmploymentDataTabs.EMPLOYMENT_TYPES}>
                <EmploymentTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>

              <TabsContent value={EmploymentDataTabs.CONTRACT_TYPES}>
                <ContractTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>
            </Tabs>
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      }
    />
  )
}

export default EmploymentData
export { EmploymentData }
