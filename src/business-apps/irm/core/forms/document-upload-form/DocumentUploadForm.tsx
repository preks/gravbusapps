import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { Button, FileUpload, type FileMetadata } from '@newwork/nw-design-system'

type DocumentUploadFormProps = BusinessAppContextProps

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ accessToken }) => {
  const dataTestId = 'investment-document-upload-form'
  const [selectedFile, setFile] = React.useState<File | FileMetadata | null>(null)

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={dataTestId} />
  }

  return (
    <div className="gba:p-6" data-testid={dataTestId}>
      <h2 className="gba:text-lg gba:font-semibold gba:mb-4" data-testid={formatDataTestId(dataTestId, 'Title')}>
        {getTranslationFromI18nKeyAndLabel('document.upload.title', 'Upload Document')}
      </h2>
      <div data-testid={formatDataTestId(dataTestId, 'FileInput')}>
        <FileUpload maxFiles={1} multiple={false} onChange={files => setFile(files[0]?.file || null)} />
      </div>
      <div className="gba:mt-4">
        <Button
          type="button"
          variant="outline"
          data-testid={formatDataTestId(dataTestId, 'Submit')}
          disabled={!selectedFile}
        >
          {getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        </Button>
      </div>
    </div>
  )
}

export default DocumentUploadForm
