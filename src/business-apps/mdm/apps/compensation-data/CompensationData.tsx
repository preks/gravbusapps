import React from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PayGradesTab, CareerBandsTab, CompensationBandsTab } from './components/tabs'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'

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

const CompensationData: React.FC<CompensationDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, onChangeTab] = useTabQueryParamSync(CompensationDataTabs, CompensationDataTabs.PAY_GRADES)

  return (
    <PageLayout
      headerIcon={<CurrencyCircleDollarIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={t('hr.compensation_data', 'Compensation Data')}
      className={`${className ? className : ''} gba:!overflow-y-visible`}
      contentContainer={
        <div className="no-scrollbar gba:w-full gba:h-full gba:overflow-y-auto gba:pb-8" style={{ padding: '24px' }}>
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
