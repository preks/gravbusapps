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
      groupCatalog: 'SalesDocumentGroup',
      typeCatalog: 'SalesDocumentType',
      dataTestIdPrefix: 'CustomerDocumentDataPage',
      headerTitle: 'Customer Document Data',
      headerDescription: 'Manage customer document groups and types'
    }),
    []
  )

  return <DocumentSettingsLayout config={config} {...props} />
}

export default DocumentDataPage
