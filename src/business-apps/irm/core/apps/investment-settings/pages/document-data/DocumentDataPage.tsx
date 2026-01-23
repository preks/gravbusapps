import React, { useMemo } from 'react'
import { DocumentSettingsLayout } from '@/common/components/common-relations/setting-pages/document'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface DocumentDataPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const DocumentDataPage: React.FC<DocumentDataPageProps> = props => {
  const config = useMemo(
    () => ({
      groupCatalog: 'InvestmentDocumentGroup',
      typeCatalog: 'InvestmentDocumentType',
      dataTestIdPrefix: 'InvestmentDocumentDataPage',
      headerTitle: 'Investment Document Data',
      headerDescription: 'Manage investment document groups and types'
    }),
    []
  )

  return <DocumentSettingsLayout config={config} {...props} />
}

export default DocumentDataPage
