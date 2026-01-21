import React from 'react'
import { InvestmentSettings } from '@/common/components/common-relations/setting-pages/investment/InvestmentSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface InvestmentSpecificDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  initialTab?: 'roles' | 'statuses' | 'stake-types'
  onBack?: () => void
}

const DATA_TEST_ID = 'InvestmentSpecificDataPage'

const InvestmentSpecificDataPage: React.FC<InvestmentSpecificDataPageProps> = ({
  prefixDataTestId,
  initialTab,
  onBack,
  ...context
}) => {
  const roles = useCatalogSettings(context, 'InvestmentRole')
  const statuses = useCatalogSettings(context, 'InvestmentStatus')
  const stakeTypes = useCatalogSettings(context, 'InvestmentStakeType')

  return (
    <InvestmentSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={initialTab}
      onBack={onBack}
      roles={roles}
      statuses={statuses}
      stakeTypes={stakeTypes}
    />
  )
}

export default InvestmentSpecificDataPage
