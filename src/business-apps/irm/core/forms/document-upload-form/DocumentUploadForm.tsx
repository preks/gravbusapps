import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'

type DocumentUploadFormProps = BusinessAppContextProps

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ accessToken }) => {
  const dataTestId = 'investment-document-upload-form'
  const [selectedFile, setFile] = React.useState<File | null>(null)

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={dataTestId} />
  }

  return (
    <div className="gba:p-6" data-testid={dataTestId}>
      <h2 className="gba:text-lg gba:font-semibold gba:mb-4" data-testid={formatDataTestId(dataTestId, 'Title')}>
        {getTranslationFromI18nKeyAndLabel('document.upload.title', 'Upload Document')}
      </h2>
      <input
        type="file"
        onChange={e => setFile(e.target.files?.[0] || null)}
        data-testid={formatDataTestId(dataTestId, 'FileInput')}
        className="gba:block"
      />
      <div className="gba:mt-4">
        <button
          className="gba:px-3 gba:py-1 gba:border gba:rounded"
          data-testid={formatDataTestId(dataTestId, 'Submit')}
          disabled={!selectedFile}
        >
          {getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        </button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
