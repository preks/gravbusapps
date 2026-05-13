import React, { useState } from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { ShieldCheckIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogTab } from '@/common/components/common-relations/setting-pages/components/CatalogTab'
import {
  getCatalogUsageCheckSpecs,
  useCatalogDeleteAvailability
} from '@/common/components/common-relations/setting-pages/hooks/useCatalogDeleteAvailability'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'
import { MARKETING_OPT_IN_SOURCE, MARKETING_OPT_IN_STATUS } from '@/common/data/customer/constants/customerCatalogs'

type MarketingComplianceTab = 'sources' | 'statuses'

export interface MarketingComplianceDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: MarketingComplianceTab
}

const DATA_TEST_ID = 'CustomerMarketingComplianceDataPage'

const getCatalogIdentifier = (catalogRef: string) => catalogRef.split(':')[0]

const MarketingComplianceDataPage: React.FC<MarketingComplianceDataPageProps> = ({
  className,
  prefixDataTestId,
  onBack,
  initialTab = 'sources',
  ...context
}) => {
  const [active, setActive] = useState<MarketingComplianceTab>(initialTab)
  const sourceCatalogIdentifier = getCatalogIdentifier(MARKETING_OPT_IN_SOURCE)
  const statusCatalogIdentifier = getCatalogIdentifier(MARKETING_OPT_IN_STATUS)
  const optInSources = useCatalogSettings(context, sourceCatalogIdentifier)
  const optInStatuses = useCatalogSettings(context, statusCatalogIdentifier)
  const getOptInSourceDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Opt-in Source',
    getCatalogUsageCheckSpecs(MARKETING_OPT_IN_SOURCE)
  )
  const getOptInStatusDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Opt-in Status',
    getCatalogUsageCheckSpecs(MARKETING_OPT_IN_STATUS)
  )
  const dataTestIdPrefix = `${prefixDataTestId || ''}-${DATA_TEST_ID}`

  return (
    <PageLayout
      headerIcon={ShieldCheckIcon}
      headerTitle="Marketing Compliance"
      headerDescription="Manage marketing opt-in sources and statuses"
      onBack={onBack}
      className={className}
      data-testid={`${dataTestIdPrefix}-Container`}
    >
      <Tabs
        value={active}
        onValueChange={value => setActive(value as MarketingComplianceTab)}
        data-testid={`${dataTestIdPrefix}-Tabs`}
      >
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <CatalogTab
            entityName="Opt-in Source"
            dataTestId={`${dataTestIdPrefix}-Sources`}
            getDeleteAvailability={getOptInSourceDeleteAvailability}
            {...optInSources}
          />
        </TabsContent>

        <TabsContent value="statuses">
          <CatalogTab
            entityName="Opt-in Status"
            dataTestId={`${dataTestIdPrefix}-Statuses`}
            getDeleteAvailability={getOptInStatusDeleteAvailability}
            {...optInStatuses}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

export default MarketingComplianceDataPage
