import React, { useCallback } from 'react'
import {
  FileUpload,
  type UploadFile,
  Button,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { X, Plus } from 'lucide-react'
import { CatalogSelect } from '@/components/catalog-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DocumentUploadItem {
  id: string
  file?: File
  uploadFile?: UploadFile
  documentGroupRef?: string
  documentTypeRef?: string
  name?: string
  description?: string
}

interface JobCandidateDocumentUploadProps {
  documents: DocumentUploadItem[]
  onChange: (documents: DocumentUploadItem[]) => void
  prefixDataTestId?: string
}

export const JobCandidateDocumentUpload: React.FC<JobCandidateDocumentUploadProps> = ({
  documents,
  onChange,
  prefixDataTestId = 'JobCandidateDocumentUpload'
}) => {
  const addDocument = useCallback(() => {
    const newDocument: DocumentUploadItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    }
    onChange([...documents, newDocument])
  }, [documents, onChange])

  const removeDocument = useCallback(
    (id: string) => {
      onChange(documents.filter(doc => doc.id !== id))
    },
    [documents, onChange]
  )

  const updateDocument = useCallback(
    (id: string, updates: Partial<DocumentUploadItem>) => {
      onChange(documents.map(doc => (doc.id === id ? { ...doc, ...updates } : doc)))
    },
    [documents, onChange]
  )

  const handleFileChange = useCallback(
    (id: string, files: any[]) => {
      const file = files?.[0]?.file || files?.[0]
      if (file instanceof File) {
        updateDocument(id, {
          file,
          uploadFile: files?.[0],
          name: file.name
        })
      }
    },
    [updateDocument]
  )

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-base gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('recruiting.documents', 'Documents')}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDocument}
          data-testid={formatDataTestId(prefixDataTestId, 'add-document-button')}
        >
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('recruiting.addDocument', 'Add Document')}
        </Button>
      </div>

      {documents.length === 0 && (
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('recruiting.noDocumentsAdded', 'No documents added yet')}
        </p>
      )}

      <div className="gba:space-y-4">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className="gba:p-4 gba:border gba:border-border gba:rounded-lg gba:bg-card"
            data-testid={formatDataTestId(prefixDataTestId, `document-${index}`)}
          >
            <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
              <h4 className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('recruiting.document', 'Document')} {index + 1}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDocument(doc.id)}
                data-testid={formatDataTestId(prefixDataTestId, `remove-document-${index}-button`)}
              >
                <X className="gba:w-4 gba:h-4" />
              </Button>
            </div>

            <div className="gba:space-y-4">
              {/* File Upload */}
              <div>
                <FormLabel>{getTranslationFromI18nKeyAndLabel('recruiting.file', 'File')}</FormLabel>
                <div className="gba:mt-2">
                  <FileUpload
                    multiple={false}
                    maxFiles={1}
                    accept="*/*"
                    layout="list"
                    preview="icon"
                    value={doc.uploadFile ? [doc.uploadFile] : []}
                    onChange={(files: any[]) => handleFileChange(doc.id, files)}
                    data-testid={formatDataTestId(prefixDataTestId, `file-upload-${index}`)}
                  />
                </div>
              </div>

              {/* Document Group */}
              <FormField
                name={`documents.${index}.documentGroupRef`}
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('recruiting.documentGroup', 'Document Group')}
                    </FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="DocumentGroup"
                        value={doc.documentGroupRef || ''}
                        onValueChange={(v: string | string[]) => {
                          const value = Array.isArray(v) ? v[0] || '' : v || ''
                          updateDocument(doc.id, { documentGroupRef: value })
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, `document-group-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document Type */}
              <FormField
                name={`documents.${index}.documentTypeRef`}
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('recruiting.documentType', 'Document Type')}
                    </FormLabel>
                    <FormControl>
                      <CatalogSelect
                        catalogIdentifier="DocumentType"
                        value={doc.documentTypeRef || ''}
                        onValueChange={(v: string | string[]) => {
                          const value = Array.isArray(v) ? v[0] || '' : v || ''
                          updateDocument(doc.id, { documentTypeRef: value })
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, `document-type-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                name={`documents.${index}.name`}
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {getTranslationFromI18nKeyAndLabel('recruiting.documentName', 'Document Name')}
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background file:gba:border-0 file:gba:bg-transparent file:gba:text-sm file:gba:font-medium placeholder:gba:text-muted-foreground focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                        value={doc.name || ''}
                        onChange={e => updateDocument(doc.id, { name: e.target.value })}
                        data-testid={formatDataTestId(prefixDataTestId, `document-name-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                name={`documents.${index}.description`}
                render={() => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('recruiting.description', 'Description')}</FormLabel>
                    <FormControl>
                      <textarea
                        className="gba:flex gba:min-h-[80px] gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background placeholder:gba:text-muted-foreground focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                        value={doc.description || ''}
                        onChange={e => updateDocument(doc.id, { description: e.target.value })}
                        data-testid={formatDataTestId(prefixDataTestId, `document-description-${index}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
