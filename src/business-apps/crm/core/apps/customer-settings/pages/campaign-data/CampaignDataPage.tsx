import React from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { MegaphoneIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'
import { CAMPAIGN_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import { CatalogTab } from '@/common/components/common-relations/setting-pages/components/CatalogTab'
import {
  getCatalogUsageCheckSpecs,
  useCatalogDeleteAvailability
} from '@/common/components/common-relations/setting-pages/hooks/useCatalogDeleteAvailability'

export interface CampaignDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'CustomerCampaignDataPage'

const CampaignDataPage: React.FC<CampaignDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const campaignTypes = useCatalogSettings(context, CAMPAIGN_TYPE)
  const getCampaignTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Campaign Type',
    getCatalogUsageCheckSpecs(CAMPAIGN_TYPE)
  )

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
        getDeleteAvailability={getCampaignTypeDeleteAvailability}
        {...campaignTypes}
      />
    </PageLayout>
  )
}

export default CampaignDataPage
