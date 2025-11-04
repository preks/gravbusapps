import React from 'react'
import { useTranslation, Button, Badge, Card, Skeleton } from '@newwork/nw-design-system'
import { ChevronRight, FileText, Folder, Home, Download, Eye } from 'lucide-react'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDocumentNavigation } from '../../hooks/useDocumentNavigation'
import { useDocumentAreas, useFolderContents } from '../../hooks/useDocumentData'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import translations from '../../_i18n'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

interface DocumentViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

/**
 * Document View - Hierarchical Document Management
 *
 * Hierarchy:
 * 1. ContentEntries (Document Areas) - shown as cards
 * 2. Folders (hierarchical)
 * 3. Documents (files)
 */
const DocumentView: React.FC<DocumentViewProps> = ({ accessToken, hideBanner = false }) => {
  const { t } = useTranslation(translations)
  const navigation = useDocumentNavigation()

  // Fetch document areas (ContentEntries with DOCUMENT group)
  const {
    areas,
    isLoading: areasLoading,
    error: areasError,
    refetch: refetchAreas
  } = useDocumentAreas(accessToken, null, [])

  // Fetch folders/documents for current location
  const {
    folders,
    documents,
    isLoading: contentsLoading,
    error: contentsError,
    refetch: refetchContents
  } = useFolderContents(accessToken, navigation.currentArea?.id || null, navigation.currentFolderId)

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchAreas()
      refetchContents()
    }
  })

  // File handlers
  const handleDownloadFile = (doc: any) => {
    if (!doc.fileInfo) {
      console.error('No fileInfo available for document:', doc)
      return
    }

    try {
      // Build correct file URL using fileUtils
      const fileUrl = buildFileUrl(doc.fileInfo)

      // Create temporary link element for download
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = doc.fileInfo.fileMetadata?.originalFileName || doc.name || 'download'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handlePreviewFile = (doc: any) => {
    if (!doc.fileInfo) {
      console.error('No fileInfo available for document:', doc)
      return
    }

    try {
      // Build correct file URL using fileUtils
      const fileUrl = buildFileUrl(doc.fileInfo)
      window.open(fileUrl, '_blank')
    } catch (error) {
      console.error('Error previewing file:', error)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Build breadcrumb items from navigation breadcrumbs
  const breadcrumbItems = navigation.breadcrumbs.map((crumb, index) => ({
    label: crumb.title,
    onClick: () => navigation.navigateToBreadcrumb(index)
  }))

  return (
    <div className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full" data-testid="document-view">
      {/* Banner */}
      {!hideBanner && !navigation.currentArea && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.DOCUMENT}
            title={t('document-welcome-title')}
            subtitle={t('document-welcome-subtitle')}
          />
        </div>
      )}

      {/* ContentEntry Header (when selected) */}
      {navigation.currentArea && (
        <div className="gba:w-full gba:bg-gradient-to-r gba:from-primary gba:to-primary/80 gba:text-primary-foreground">
          {navigation.currentArea.picture && (
            <div
              className="gba:w-full gba:h-48 gba:bg-cover gba:bg-center"
              style={{ backgroundImage: `url(${navigation.currentArea.picture})` }}
            />
          )}
          <div className="gba:max-w-[1440px] gba:mx-auto gba:px-6 gba:py-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigation.selectArea(null)}
              className="gba:mb-4 gba:text-primary-foreground gba:hover:bg-primary-foreground/20"
            >
              <Home className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('back_to_areas')}
            </Button>
            <h1 className="gba:text-4xl gba:font-bold gba:mb-2">{navigation.currentArea.title}</h1>
            {navigation.currentArea.preview && (
              <p className="gba:text-lg gba:opacity-90">{navigation.currentArea.preview}</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="gba:max-w-[1440px] gba:mx-auto gba:px-6 gba:py-6 gba:w-full">
        {/* Level 1: Document Areas (Cards) */}
        {!navigation.currentArea && (
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <h2 className="gba:text-2xl gba:font-bold">{t('document_areas')}</h2>
              <AppAction
                contextsArray={[FlowContextName.contentEntryCreate]}
                externalContextData={{ contentGroup: ContentGroup.DOCUMENT }}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                data-testid="create-document-area-button"
              >
                <Button>{t('create_area')}</Button>
              </AppAction>
            </div>

            {areasLoading && (
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="gba:overflow-hidden">
                    <Skeleton className="gba:h-40 gba:w-full" />
                    <div className="gba:p-6 gba:space-y-3">
                      <Skeleton className="gba:h-6 gba:w-3/4" />
                      <Skeleton className="gba:h-4 gba:w-full" />
                      <Skeleton className="gba:h-4 gba:w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {areasError && (
              <div className="gba:text-center gba:py-12 gba:text-destructive">{t('error_loading_areas')}</div>
            )}

            {!areasLoading && !areasError && areas.length === 0 && (
              <div className="gba:text-center gba:py-12">
                <Folder className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mb-4 gba:mx-auto" />
                <p className="gba:text-muted-foreground">{t('no_document_areas')}</p>
              </div>
            )}

            {!areasLoading && !areasError && areas.length > 0 && (
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
                {areas.map(area => (
                  <Card
                    key={area.id}
                    className="gba:cursor-pointer gba:transition-all gba:hover:shadow-lg gba:hover:-translate-y-1"
                    onClick={() => navigation.selectArea(area)}
                    data-testid={`area-card-${area.id}`}
                  >
                    {area.picture && (
                      <div
                        className="gba:w-full gba:h-40 gba:bg-cover gba:bg-center gba:rounded-t-lg"
                        style={{ backgroundImage: `url(${area.picture})` }}
                      />
                    )}
                    <div className="gba:p-6">
                      <h3 className="gba:text-xl gba:font-semibold gba:mb-2 gba:flex gba:items-center gba:gap-2">
                        <Folder className="gba:w-5 gba:h-5 gba:text-primary" />
                        {area.title}
                      </h3>
                      {area.preview && (
                        <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-3">{area.preview}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Level 2+: File Explorer (Folders & Documents) */}
        {navigation.currentArea && (
          <div>
            {/* Breadcrumbs */}
            {breadcrumbItems.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6 gba:text-sm">
                {breadcrumbItems.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />}
                    <button
                      onClick={crumb.onClick}
                      className="gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors"
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <h2 className="gba:text-lg gba:font-semibold">
                {navigation.currentFolderId
                  ? navigation.breadcrumbs[navigation.breadcrumbs.length - 1]?.title || t('folder')
                  : t('all_items')}
              </h2>
              <div className="gba:flex gba:gap-2">
                <AppAction
                  contextsArray={[FlowContextName.contentDocumentCreate]}
                  externalContextData={{ contentEntryId: navigation.currentArea.id }}
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                  data-testid="create-document-button"
                >
                  <Button size="sm">{t('create_document')}</Button>
                </AppAction>
              </div>
            </div>

            {/* Loading State */}
            {contentsLoading && (
              <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
                {/* Table Header */}
                <div className="gba:grid gba:grid-cols-[1fr_150px_150px_80px] gba:gap-4 gba:px-6 gba:py-3 gba:bg-muted/50 gba:border-b gba:border-border gba:text-sm gba:font-medium gba:text-muted-foreground">
                  <div>{t('name') || 'Name'}</div>
                  <div>{t('modified') || 'Modified'}</div>
                  <div>{t('size') || 'Size'}</div>
                  <div>{t('actions') || 'Actions'}</div>
                </div>
                {/* Skeleton Rows */}
                <div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="gba:grid gba:grid-cols-[1fr_150px_150px_80px] gba:gap-4 gba:px-6 gba:py-4 gba:border-b gba:border-border last:gba:border-b-0"
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Skeleton className="gba:w-5 gba:h-5" />
                        <Skeleton className="gba:h-4 gba:w-48" />
                      </div>
                      <Skeleton className="gba:h-4 gba:w-24" />
                      <Skeleton className="gba:h-4 gba:w-16" />
                      <div className="gba:flex gba:gap-2">
                        <Skeleton className="gba:h-8 gba:w-8" />
                        <Skeleton className="gba:h-8 gba:w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {contentsError && (
              <div className="gba:text-center gba:py-12 gba:text-destructive">{t('error_loading_contents')}</div>
            )}

            {/* Empty State */}
            {!contentsLoading && !contentsError && folders.length === 0 && documents.length === 0 && (
              <div className="gba:text-center gba:py-12">
                <FileText className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mb-4 gba:mx-auto" />
                <p className="gba:text-muted-foreground">{t('no_items')}</p>
              </div>
            )}

            {/* File Manager List */}
            {!contentsLoading && !contentsError && (folders.length > 0 || documents.length > 0) && (
              <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
                {/* Table Header */}
                <div className="gba:grid gba:grid-cols-[1fr_150px_150px_80px] gba:gap-4 gba:px-6 gba:py-3 gba:bg-muted/50 gba:border-b gba:border-border gba:text-sm gba:font-medium gba:text-muted-foreground">
                  <div>{t('name') || 'Name'}</div>
                  <div>{t('modified') || 'Modified'}</div>
                  <div>{t('size') || 'Size'}</div>
                  <div>{t('actions') || 'Actions'}</div>
                </div>

                {/* Folders */}
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => navigation.navigateToFolder(folder)}
                    className="gba:w-full gba:grid gba:grid-cols-[1fr_150px_150px_80px] gba:gap-4 gba:px-6 gba:py-4 gba:border-b gba:border-border last:gba:border-b-0 gba:transition-colors hover:gba:bg-accent gba:text-left"
                    data-testid={`folder-${folder.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <Folder className="gba:w-5 gba:h-5 gba:text-primary gba:shrink-0" />
                      <span className="gba:font-medium gba:truncate">{folder.name || 'Unnamed Folder'}</span>
                    </div>
                    <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center">
                      {formatDate(folder.updatedAt || folder.createdAt)}
                    </div>
                    <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center">-</div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    </div>
                  </button>
                ))}

                {/* Documents */}
                {documents.map(doc => {
                  const originalFileName = doc.fileInfo?.fileMetadata?.originalFileName
                  const displayName = originalFileName || doc.name || 'Unnamed File'
                  const fileExtension = originalFileName
                    ? originalFileName.split('.').pop()?.toUpperCase()
                    : doc.fileInfo?.fileMetadata?.mimeType?.split('/')[1]?.toUpperCase()
                  const fileSize = doc.fileInfo?.fileMetadata?.size as number | undefined

                  return (
                    <div
                      key={doc.id}
                      className="gba:grid gba:grid-cols-[1fr_150px_150px_80px] gba:gap-4 gba:px-6 gba:py-4 gba:border-b gba:border-border last:gba:border-b-0 gba:transition-colors hover:gba:bg-accent"
                      data-testid={`document-${doc.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                        <FileText className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:shrink-0" />
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:font-medium gba:truncate" title={displayName}>
                            {displayName}
                          </div>
                          {doc.description && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{doc.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center">
                        {formatDate(doc.updatedAt)}
                      </div>
                      <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span>{formatFileSize(fileSize)}</span>
                          {fileExtension && (
                            <Badge variant="secondary" className="gba:text-xs gba:px-1 gba:py-0">
                              {fileExtension}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreviewFile(doc)}
                          className="gba:h-8 gba:w-8 gba:p-0"
                          title={t('preview') || 'Preview'}
                          data-testid={`document-preview-${doc.id}`}
                        >
                          <Eye className="gba:w-4 gba:h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadFile(doc)}
                          className="gba:h-8 gba:w-8 gba:p-0"
                          title={t('download') || 'Download'}
                          data-testid={`document-download-${doc.id}`}
                        >
                          <Download className="gba:w-4 gba:h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentView
