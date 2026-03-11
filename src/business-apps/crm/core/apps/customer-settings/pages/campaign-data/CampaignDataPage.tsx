import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { MegaphoneIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'
import { CatalogTab } from '@/common/components/common-relations/setting-pages/components/CatalogTab'

export interface CampaignDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'CustomerCampaignDataPage'

const CampaignDataPage: React.FC<CampaignDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const campaignTypes = useCatalogSettings(context, 'CustomerCampaignType:v1')

  return (
    <PageLayout
      headerIcon={MegaphoneIcon}
      headerTitle="Campaign Data"
      headerDescription="Manage campaign types"
      onBack={onBack}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
    >
      <CatalogTab
        entityName="Campaign Type"
        dataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}-CampaignTypes`}
        {...campaignTypes}
      />
    </PageLayout>
  )
}

export default CampaignDataPage
