import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PayGradesTab, CareerBandsTab, CompensationBandsTab } from './components/tabs'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react'

export enum CompensationDataTabs {
  PAY_GRADES = 'pay-grades',
  CAREER_BANDS = 'career-bands',
  COMPENSATION_BANDS = 'compensation-bands'
}

export interface CompensationDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'CompensationData'

// Helper function to get initial tab from URL
const getInitialTab = (): CompensationDataTabs => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')

    if (tabParam && Object.values(CompensationDataTabs).includes(tabParam as CompensationDataTabs)) {
      return tabParam as CompensationDataTabs
    }
  }
  return CompensationDataTabs.PAY_GRADES
}

const CompensationData: React.FC<CompensationDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<CompensationDataTabs>(getInitialTab)

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && Object.values(CompensationDataTabs).includes(tabParam as CompensationDataTabs)) {
        setSelectedTab(tabParam as CompensationDataTabs)
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
    setSelectedTab(value as CompensationDataTabs)
  }

  return (
    <PageLayout
      headerIcon={<CurrencyCircleDollarIcon />}
      headerLabel={t('hr.compensation_data', 'Compensation Data')}
      className={`${className ? className : ''} gba:!overflow-y-visible`}
      contentContainer={
        <div className="gba:w-full gba:h-full gba:!overflow-y-auto" style={{ padding: '24px' }}>
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                <TabsTrigger value={CompensationDataTabs.PAY_GRADES}>
                  {t('hr.compensation_data', 'Pay Grades')}
                </TabsTrigger>
                <TabsTrigger value={CompensationDataTabs.CAREER_BANDS}>
                  {t('hr.compensation_data', 'Career Bands')}
                </TabsTrigger>
                <TabsTrigger value={CompensationDataTabs.COMPENSATION_BANDS}>
                  {t('hr.compensation_data', 'Compensation Bands')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={CompensationDataTabs.PAY_GRADES}>
                <PayGradesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>

              <TabsContent value={CompensationDataTabs.CAREER_BANDS}>
                <CareerBandsTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>

              <TabsContent value={CompensationDataTabs.COMPENSATION_BANDS}>
                <CompensationBandsTab
                  {...contextProps}
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              </TabsContent>
            </Tabs>
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      }
    />
  )
}

export default CompensationData
export { CompensationData }
