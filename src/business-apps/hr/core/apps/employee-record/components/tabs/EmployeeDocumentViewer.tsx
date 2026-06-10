import { useEffect, useState } from 'react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import documentsI18n from './_i18n'

interface EmployeeDocumentViewerProps {
  readonly accessToken: string
  readonly open: boolean
  readonly documentName?: string | null
  readonly mimeType?: string | null
  readonly fileRef?: string | null
  readonly employeeId?: string | null
  readonly documentGroup?: string | null
  readonly documentType?: string | null
  readonly createdAt?: string | null
  readonly createdBy?: string | null
  readonly expirationDate?: string | null
  readonly description?: string | null
  readonly onOpenChange: (open: boolean) => void
}

interface DocumentInfoItemProps {
  readonly label: string
  readonly value: string
}

const DocumentInfoItem = ({ label, value }: DocumentInfoItemProps) => (
  <div className="gba:mb-3">
    <div className="gba:text-xs gba:text-muted-foreground">{label}</div>
    <div className="gba:text-sm gba:text-foreground gba:break-words">{value}</div>
  </div>
)

export function EmployeeDocumentViewer({
  accessToken,
  open,
  documentName,
  mimeType,
  fileRef,
  employeeId,
  documentGroup,
  documentType,
  createdAt,
  createdBy,
  expirationDate,
  description,
  onOpenChange
}: EmployeeDocumentViewerProps) {
  const { t } = useTranslation(documentsI18n)
  const fileClient = useFileClient({ accessToken })
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = () => {
    if (!viewerUrl) {
      return
    }

    const link = document.createElement('a')
    link.href = viewerUrl
    link.download = documentName || 'document'
    link.click()
  }

  useEffect(() => {
    if (!open || !fileRef || !employeeId) {
      setViewerUrl(null)
      setError(null)
      return
    }

    let isMounted = true
    let objectUrl: string | null = null

    const loadFile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const blob = await fileClient.getFile(
          {
            accessScope: 'tenant',
            fileId: fileRef
          },
          {
            appName: 'employee-profile',
            folderPath: `/documents/${employeeId}`
          }
        )

        if (!isMounted) {
          return
        }

        const resolvedBlob = mimeType?.includes('pdf') ? new Blob([blob], { type: 'application/pdf' }) : blob
        objectUrl = URL.createObjectURL(resolvedBlob)
        setViewerUrl(objectUrl)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        console.error('[EmployeeDocumentsTab] Failed to open document viewer:', loadError)
        setError(t('documents-error-load-document'))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadFile()

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [employeeId, fileClient, fileRef, mimeType, open, t])

  const formatDate = (value?: string | null) => {
    if (!value) {
      return t('documents-detail-na')
    }

    return new Date(value).toLocaleDateString()
  }

  const renderDocumentViewer = () => {
    if (!viewerUrl) {
      return null
    }

    if (mimeType?.includes('pdf')) {
      return (
        <div className="gba:w-full gba:overflow-hidden gba:rounded-md">
          <object
            data={viewerUrl}
            type="application/pdf"
            className="gba:w-full gba:h-96 gba:block gba:border-0 gba:rounded-md"
            data-testid="pdf-viewer"
          >
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:p-4">
              <p className="gba:mb-4 gba:text-center">{t('documents-browser-no-pdf')}</p>
              <Button
                onClick={handleDownload}
                className="gba:w-auto gba:flex gba:items-center gba:gap-2"
                data-testid="pdf-download-link"
                variant="secondary"
              >
                {t('documents-download-pdf')}
              </Button>
            </div>
          </object>
        </div>
      )
    }

    if (mimeType?.includes('image')) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:rounded-md gba:p-4 gba:w-full">
          <img
            src={viewerUrl}
            alt={documentName || t('documents-count-one')}
            className="gba:max-w-full gba:max-h-96 gba:object-contain gba:rounded-md"
            onError={() => setError(t('documents-error-image-display'))}
            data-testid="image-viewer"
          />
        </div>
      )
    }

    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:rounded-md gba:min-h-80 gba:w-full">
        <p className="gba:mb-4 gba:text-center gba:text-muted-foreground gba:text-base">
          {t('documents-preview-not-available')}
        </p>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gba:p-0 gba:flex gba:flex-col" data-testid="document-viewer-drawer">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left gba:break-words">{documentName || ''}</SheetTitle>
        </SheetHeader>

        <div className="gba:flex-1 gba:overflow-auto">
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
              <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
                <Spinner size="lg" />
                <div className="gba:mt-2">{t('documents-loading')}</div>
              </div>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-destructive">
              <p>{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && viewerUrl ? (
            <div className="gba:flex gba:flex-col gba:w-full">
              <div className="gba:w-full gba:min-h-96 gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-6">
                {renderDocumentViewer()}
                <Button
                  onClick={handleDownload}
                  className="gba:mt-4 gba:flex gba:items-center gba:gap-2"
                  data-testid="document-download-button"
                  variant="default"
                  size="sm"
                >
                  {t('documents-download')}
                </Button>
              </div>

              <div className="gba:border-t gba:border-border gba:p-6">
                <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4">
                  {t('documents-detail-information')}
                </h4>

                <div className="gba:space-y-1">
                  <DocumentInfoItem
                    label={t('documents-detail-name')}
                    value={documentName || t('documents-detail-na')}
                  />
                  <DocumentInfoItem
                    label={t('documents-detail-group')}
                    value={documentGroup || t('documents-detail-na')}
                  />
                  <DocumentInfoItem
                    label={t('documents-detail-type')}
                    value={documentType || t('documents-detail-na')}
                  />
                  <DocumentInfoItem label={t('documents-detail-upload-date')} value={formatDate(createdAt)} />
                  <DocumentInfoItem
                    label={t('documents-detail-uploaded-by')}
                    value={createdBy || t('documents-detail-na')}
                  />
                  <DocumentInfoItem label={t('documents-detail-expiration-date')} value={formatDate(expirationDate)} />
                  <DocumentInfoItem
                    label={t('documents-detail-description')}
                    value={description || t('documents-detail-no-description')}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
