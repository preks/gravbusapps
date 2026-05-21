import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentPopup } from '@/business-apps/irm/core/popups/document-popup'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type DocumentUploadFormProps = BusinessAppContextProps

/**
 * Shared IRM document upload form entrypoint.
 * Keeps a stable common-form wrapper while delegating actual behavior
 * to the centralized `DocumentPopup` implementation (now including company context).
 */
const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ accessToken, ...props }) => {
  const dataTestId = 'investment-document-upload-form'

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={dataTestId} />
  }

  return (
    <div data-testid={formatDataTestId(dataTestId, 'Container')}>
      <DocumentPopup accessToken={accessToken} {...props} />
    </div>
  )
}

export default DocumentUploadForm
