import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster, useTranslation } from '@newwork/nw-design-system'
import { useTranslation as useI18nextTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BriefcaseIcon } from '@phosphor-icons/react'
import { EmploymentTypesTab } from './components/tabs/EmploymentTypesTab'
import { ContractTypesTab } from './components/tabs/ContractTypesTab'
import translations from './_i18n'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'

export enum EmploymentDataTabs {
  EMPLOYMENT_TYPES = 'employment-types',
  CONTRACT_TYPES = 'contract-types'
}

export interface EmploymentDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'EmploymentData'

const EmploymentData: React.FC<EmploymentDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation(translations)
  const { t: tGlobal } = useI18nextTranslation()
  const [selectedTab, onChangeTab] = useTabQueryParamSync(EmploymentDataTabs, EmploymentDataTabs.EMPLOYMENT_TYPES)

  return (
    <PageLayout
      headerIcon={<BriefcaseIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={tGlobal('hr.employment_data', 'Employment Data')}
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
