import React, { useMemo } from 'react'
import { DocumentSettingsLayout } from '@/common/components/common-relations/setting-pages/document'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface InvestmentGroupsTypesPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const InvestmentGroupsTypesPage: React.FC<InvestmentGroupsTypesPageProps> = props => {
  const config = useMemo(
    () => ({
      groupCatalog: 'InvestmentGroup',
      typeCatalog: 'InvestmentType',
      dataTestIdPrefix: 'InvestmentGroupsTypesPage',
      headerTitle: 'Investment Groups & Types',
      headerDescription: 'Manage investment groups and their associated types',
      groupLabel: 'Investment Groups',
      typeLabel: 'Investment Types'
    }),
    []
  )

  return <DocumentSettingsLayout config={config} {...props} />
}

export default InvestmentGroupsTypesPage
