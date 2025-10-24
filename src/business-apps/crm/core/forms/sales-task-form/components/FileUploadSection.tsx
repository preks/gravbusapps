import React from 'react'
import { FileUpload, type FileMetadata, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'SalesTaskForm-FileUpload'

const FileUploadSection: React.FC = () => {
  const { formValues, setFormValues } = useSalesTaskFormContext()

  // Convert existing documents to FileMetadata format
  const initialFiles: FileMetadata[] = (formValues.documents || []).map(doc => ({
    id: doc.id,
    name: doc.name || 'Unnamed Document',
    size: 0,
    type: '',
    url: doc.id
  }))

  // Create a stable key based on existing document IDs to force re-render when documents change
  const fileUploadKey = (formValues.documents || []).map(d => d.id).join(',') || 'empty'

  return (
    <FormItem>
      <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFile', 'Attach Documents')}</FormLabel>
      <FormControl>
        <FileUpload
          key={fileUploadKey}
          layout="list"
          preview="icon"
          maxFiles={10}
          maxSizeMB={10}
          multiple={true}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
          initialFiles={initialFiles}
          onFilesChange={files => {
            // Extract File objects from FileWithPreview
            const newFiles = files
              .map(f => (f.file instanceof File ? f.file : null))
              .filter((f): f is File => f !== null)

            if (newFiles.length > 0) {
              setFormValues({
                _pendingFiles: [...(formValues._pendingFiles || []), ...newFiles]
              })
            }

            // Handle file removal - check which initial files are missing
            const currentFileIds = new Set(files.map(f => f.id))
            const removedDocs = initialFiles.filter(initial => !currentFileIds.has(initial.id))

            if (removedDocs.length > 0) {
              setFormValues({
                documents: (formValues.documents || []).filter(
                  doc => !removedDocs.some(removed => removed.id === doc.id)
                )
              })
            }
          }}
          data-testid={formatDataTestId(prefixDataTestId, 'FileUpload')}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

export default FileUploadSection
