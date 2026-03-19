import React, { useMemo } from 'react'
import { DocumentSettingsLayout } from '@/common/components/common-relations/setting-pages/document'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface InvestmentLiquidFundTypesPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const InvestmentLiquidFundTypesPage: React.FC<InvestmentLiquidFundTypesPageProps> = props => {
  const config = useMemo(
    () => ({
      groupCatalog: 'InvestmentType',
      typeCatalog: 'InvestmentLiquidFundType',
      dataTestIdPrefix: 'InvestmentLiquidFundTypesPage',
      headerTitle: 'Liquid Fund Types',
      headerDescription: 'Manage liquid fund sub-types for each investment type',
      groupLabel: 'Investment Types',
      typeLabel: 'Liquid Fund Types',
      filterGroupsByParentCode: { catalog: 'InvestmentGroup', code: 'LIQUID_FUND' }
    }),
    []
  )

  return <DocumentSettingsLayout config={config} {...props} />
}

export default InvestmentLiquidFundTypesPage
