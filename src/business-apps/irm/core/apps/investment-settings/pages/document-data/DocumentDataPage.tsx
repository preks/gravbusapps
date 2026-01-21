import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSettings } from '@/common/components/common-relations/setting-pages/document/DocumentSettings'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

interface DocumentDataPageProps extends BusinessAppContextProps {
  onBack?: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'investment-document-data'

const DocumentDataPage: React.FC<DocumentDataPageProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onBack,
  prefixDataTestId
}) => {
  const groups = useCatalogSettings({ accessToken, userInfo, additionalData }, 'InvestmentDocumentGroup')
  const types = useCatalogSettings({ accessToken, userInfo, additionalData }, 'InvestmentDocumentType')

  return (
    <DocumentSettings
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      groups={{ data: groups.items, loading: groups.isLoading, error: groups.error }}
      types={{ data: types.items, loading: types.isLoading, error: types.error }}
      groupHandlers={{ onCreate: groups.onCreate, onUpdate: groups.onUpdate, onDelete: groups.onDelete }}
      typeHandlers={{ onCreate: types.onCreate, onUpdate: types.onUpdate, onDelete: types.onDelete }}
      onBack={onBack}
      prefixDataTestId={`${prefixDataTestId}-${DATA_TEST_ID}`}
      headerTitle="Investment Document Data"
      headerDescription="Manage investment document groups and types"
    />
  )
}

export default DocumentDataPage
