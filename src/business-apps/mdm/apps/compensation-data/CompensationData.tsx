import React from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'
import CompensationBandPolicyTab from '@/business-apps/mdm/apps/compensation-data/components/tabs/CompensationBandPolicyTab.tsx'
import CompensationBandsTab from './components/tabs/CompensationBandsTab'

export enum CompensationDataTabs {
  COMPENSATION_BANDS = 'compensation-bands',
  COMPENSATION_BAND_POLICY = 'compensation-band-policy'
}

export interface CompensationDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'CompensationData'

const CompensationData: React.FC<CompensationDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, onChangeTab] = useTabQueryParamSync(CompensationDataTabs, CompensationDataTabs.COMPENSATION_BANDS)

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
                <TabsTrigger value={CompensationDataTabs.COMPENSATION_BANDS}>
                  {t('hr.compensation_data', 'Compensation Bands')}
                </TabsTrigger>
                <TabsTrigger value={CompensationDataTabs.COMPENSATION_BAND_POLICY}>
                  {t('hr.compensation_band_policy', 'Band Policies')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={CompensationDataTabs.COMPENSATION_BANDS}>
                <CompensationBandsTab
                  {...contextProps}
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              </TabsContent>

              <TabsContent value={CompensationDataTabs.COMPENSATION_BAND_POLICY}>
                <CompensationBandPolicyTab
                  {...contextProps}
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      }
    />
  )
}

export default CompensationData
export { CompensationData }
